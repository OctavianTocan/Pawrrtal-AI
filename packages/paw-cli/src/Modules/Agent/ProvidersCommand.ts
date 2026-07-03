/** `paw providers` commands for inspecting selectable Agent Providers. */

import { Ids } from '@pawrrtal/domain-core';
import { AgentProviderRead, ProviderConformanceResultRead } from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import { Console, Effect, Option, Schema } from 'effect';
import { Argument, Command } from 'effect/unstable/cli';
import type { CommandMetadata, CommandModule, EmptyCommandContext } from '../../Helpers/CommandMetadata';
import { AUTOMATION_FLAG_METADATA, applyCommandMetadata } from '../../Helpers/CommandMetadata';
import type { ExternalError, UsageError, VerificationError } from '../../Helpers/Errors';
import { VerificationError as CliVerificationError } from '../../Helpers/Errors';
import { ExitCode } from '../../Helpers/ExitCode';
import type { AutomationOptions } from '../../Helpers/Options';
import { automationFlags } from '../../Helpers/Options';
import { formatOutput, resolveOutputMode } from '../../Helpers/Output';
import type { ActiveCliContext } from '../../Infrastructure/ActiveContext';
import { requestJson } from './ApiClient';

const providerDoctorFlags = {
  provider: Argument.string('provider').pipe(
    Argument.optional,
    Argument.withDescription('Provider id to inspect; omitted means every provider')
  ),
  ...automationFlags,
} as const;

type ProvidersDoctorOptions = AutomationOptions & {
  readonly provider: Option.Option<string>;
};

const PROVIDERS_LIST_METADATA = {
  name: 'list',
  summary: 'List selectable Agent Providers',
  description: 'List providers exposed by the Pawrrtal backend, including readiness and capability summaries.',
  owner: '@pawrrtal/cli/Modules/Agent',
  aliases: ['ls'],
  flags: AUTOMATION_FLAG_METADATA,
  examples: [
    { command: 'paw providers list', description: 'List provider readiness' },
    { command: 'paw providers ls --json', description: 'List providers for automation' },
  ],
  environment: [{ name: 'PAW_BACKEND_URL', purpose: 'Backend target used for provider reads' }],
  outputModes: ['human', 'json', 'plain'],
  structuredOutputs: [
    {
      mode: 'json',
      contract: 'AgentProviderRead[]',
      description: 'Schema-backed selectable provider definitions.',
    },
  ],
  exitCodes: [ExitCode.success, ExitCode.usage, ExitCode.external, ExitCode.verification],
} satisfies CommandMetadata;

const PROVIDERS_DOCTOR_METADATA = {
  name: 'doctor',
  summary: 'Check Agent Provider conformance',
  description: 'Read provider readiness and conformance diagnostics through the public Pawrrtal API.',
  owner: '@pawrrtal/cli/Modules/Agent',
  arguments: [{ name: 'provider', description: 'Provider id to inspect; omitted means every provider', kind: 'string', required: false }],
  flags: AUTOMATION_FLAG_METADATA,
  examples: [
    { command: 'paw providers doctor deterministic', description: 'Check deterministic provider conformance' },
    { command: 'paw providers doctor --json', description: 'Check every provider for automation' },
  ],
  environment: [{ name: 'PAW_BACKEND_URL', purpose: 'Backend target used for provider diagnostics' }],
  outputModes: ['human', 'json', 'plain'],
  structuredOutputs: [
    {
      mode: 'json',
      contract: 'ProviderConformanceResultRead[]',
      description: 'Schema-backed provider conformance rows.',
    },
  ],
  exitCodes: [ExitCode.success, ExitCode.usage, ExitCode.external, ExitCode.verification],
} satisfies CommandMetadata;

const PROVIDERS_METADATA = {
  name: 'providers',
  summary: 'Inspect Agent Providers',
  description: 'Inspect selectable Agent Providers through the public Pawrrtal API.',
  owner: '@pawrrtal/cli/Modules/Agent',
  subcommands: [PROVIDERS_LIST_METADATA, PROVIDERS_DOCTOR_METADATA],
  examples: [{ command: 'paw providers list', description: 'List provider readiness' }],
  environment: [{ name: 'PAW_BACKEND_URL', purpose: 'Backend target used for provider reads' }],
  outputModes: ['human'],
  exitCodes: [ExitCode.success, ExitCode.usage, ExitCode.external, ExitCode.verification],
} satisfies CommandMetadata;

const ProvidersListCommand = {
  command: applyCommandMetadata(
    Command.make('list', automationFlags, handleProvidersList).pipe(Command.withAlias('ls')),
    PROVIDERS_LIST_METADATA
  ),
  metadata: PROVIDERS_LIST_METADATA,
} satisfies CommandModule<
  'list',
  AutomationOptions,
  EmptyCommandContext,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
>;

const ProvidersDoctorCommand = {
  command: applyCommandMetadata(Command.make('doctor', providerDoctorFlags, handleProvidersDoctor), PROVIDERS_DOCTOR_METADATA),
  metadata: PROVIDERS_DOCTOR_METADATA,
} satisfies CommandModule<
  'doctor',
  ProvidersDoctorOptions,
  EmptyCommandContext,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
>;

/** Command group for provider diagnostics. */
export const ProvidersCommand = {
  command: applyCommandMetadata(
    Command.make('providers').pipe(Command.withSubcommands([ProvidersListCommand.command, ProvidersDoctorCommand.command])),
    PROVIDERS_METADATA
  ),
  metadata: PROVIDERS_METADATA,
} satisfies CommandModule<
  'providers',
  EmptyCommandContext,
  EmptyCommandContext,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
>;

/** Lists provider definitions from the backend. */
function handleProvidersList(
  options: AutomationOptions
): Effect.Effect<void, UsageError | ExternalError | VerificationError, ActiveCliContext> {
  return Effect.gen(function* () {
    const mode = yield* resolveOutputMode(options);
    const providers = yield* requestJson('GET', '/agent-providers/', Schema.Array(AgentProviderRead));
    const output = yield* formatOutput(providers, mode, providerListFormatters);
    yield* Console.log(output);
  });
}

/** Reads conformance status for one provider or every provider. */
function handleProvidersDoctor(
  options: ProvidersDoctorOptions
): Effect.Effect<void, UsageError | ExternalError | VerificationError, ActiveCliContext> {
  return Effect.gen(function* () {
    const mode = yield* resolveOutputMode(options);
    const rows = yield* Option.match(options.provider, {
      onNone: readEveryProviderConformance,
      onSome: (provider) => readProviderConformance(provider),
    });
    const output = yield* formatOutput(rows, mode, providerConformanceFormatters);
    yield* Console.log(output);
  });
}

/** Reads conformance rows for every listed provider. */
function readEveryProviderConformance(): Effect.Effect<
  ReadonlyArray<ProviderConformanceResultRead>,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
> {
  return Effect.gen(function* () {
    const providers = yield* requestJson('GET', '/agent-providers/', Schema.Array(AgentProviderRead));
    const rows = yield* Effect.forEach(providers, (provider) => readProviderConformance(provider.providerId));
    return rows.flat();
  });
}

/** Reads conformance rows for one provider id. */
function readProviderConformance(
  provider: string
): Effect.Effect<
  ReadonlyArray<ProviderConformanceResultRead>,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
> {
  return Effect.gen(function* () {
    const providerId = yield* decodeProviderId(provider);
    return yield* requestJson(
      'GET',
      `/agent-providers/${providerId}/conformance`,
      Schema.Array(ProviderConformanceResultRead)
    );
  });
}

/** Decodes a CLI provider id through the public provider id schema. */
function decodeProviderId(provider: string): Effect.Effect<ProviderConformanceResultRead['providerId'], VerificationError> {
  return Schema.decodeEffect(Ids.provider)(provider).pipe(
    Effect.mapError(
      (schemaError) =>
        new CliVerificationError({
          message: 'Provider id is not valid.',
          hint: 'Use a provider id returned by paw providers list.',
          details: String(schemaError),
        })
    )
  );
}

const providerListFormatters = {
  human: (providers: ReadonlyArray<AgentProviderRead>): string =>
    providers.length === 0
      ? 'No providers are registered.'
      : providers.map((provider) => `${provider.providerId}\t${provider.readiness}\t${provider.kind}\t${provider.displayName}`).join('\n'),
  json: {
    schema: Schema.Array(AgentProviderRead),
    render: (providers: ReadonlyArray<AgentProviderRead>): ReadonlyArray<AgentProviderRead> => providers,
  },
  plain: (providers: ReadonlyArray<AgentProviderRead>): string =>
    providers.map((provider) => `${provider.providerId}\t${provider.readiness}\t${provider.kind}`).join('\n'),
};

const providerConformanceFormatters = {
  human: (rows: ReadonlyArray<ProviderConformanceResultRead>): string =>
    rows.length === 0
      ? 'No provider conformance rows were reported.'
      : rows
          .map((row) => `${row.providerId}\t${row.scenarioId}\t${row.result}\t${row.diagnostics.map((d) => `${d.key}:${d.value}`).join(',')}`)
          .join('\n'),
  json: {
    schema: Schema.Array(ProviderConformanceResultRead),
    render: (
      rows: ReadonlyArray<ProviderConformanceResultRead>
    ): ReadonlyArray<ProviderConformanceResultRead> => rows,
  },
  plain: (rows: ReadonlyArray<ProviderConformanceResultRead>): string =>
    rows.map((row) => `${row.providerId}\t${row.scenarioId}\t${row.result}`).join('\n'),
};
