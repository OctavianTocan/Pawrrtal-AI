/** `paw sessions` commands for starting turns and reading normalized events. */

import { Ids } from '@pawrrtal/domain-core';
import {
  AgentCancellationInput,
  AgentProviderEventRead,
  AgentTurnCreateInput,
  AgentTurnRead
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { Console, Effect, Option, Schema } from 'effect';
import { Argument, Command, Flag } from 'effect/unstable/cli';
import type { CommandMetadata, CommandModule, EmptyCommandContext } from '../../Helpers/CommandMetadata';
import { AUTOMATION_FLAG_METADATA, applyCommandMetadata } from '../../Helpers/CommandMetadata';
import type { ExternalError, UsageError } from '../../Helpers/Errors';
import { VerificationError } from '../../Helpers/Errors';
import { ExitCode } from '../../Helpers/ExitCode';
import type { AutomationOptions } from '../../Helpers/Options';
import { automationFlags } from '../../Helpers/Options';
import { formatOutput, resolveOutputMode } from '../../Helpers/Output';
import type { ActiveCliContext } from '../../Infrastructure/ActiveContext';
import { requestJson } from './ApiClient';

const sendFlags = {
  session: Argument.string('session-id').pipe(Argument.withDescription('Existing Session id')),
  message: Argument.string('message').pipe(Argument.withDescription('User message to send')),
  provider: Flag.string('provider').pipe(Flag.optional, Flag.withDescription('Provider override for this turn')),
  ...automationFlags,
} as const;

const eventsFlags = {
  session: Argument.string('session-id').pipe(Argument.withDescription('Existing Session id')),
  turn: Argument.string('turn-id').pipe(Argument.withDescription('Turn id to inspect')),
  follow: Flag.boolean('follow').pipe(
    Flag.withDefault(false),
    Flag.withDescription('Poll until the turn reaches a terminal state')
  ),
  ...automationFlags,
} as const;

const cancelFlags = {
  session: Argument.string('session-id').pipe(Argument.withDescription('Existing Session id')),
  turn: Argument.string('turn-id').pipe(Argument.withDescription('Turn id to cancel')),
  reason: Flag.string('reason').pipe(Flag.optional, Flag.withDescription('Safe cancellation reason')),
  ...automationFlags,
} as const;

type SessionsSendOptions = AutomationOptions & {
  readonly session: string;
  readonly message: string;
  readonly provider: Option.Option<string>;
};

type SessionsEventsOptions = AutomationOptions & {
  readonly session: string;
  readonly turn: string;
  readonly follow: boolean;
};

type SessionsCancelOptions = AutomationOptions & {
  readonly session: string;
  readonly turn: string;
  readonly reason: Option.Option<string>;
};

const SESSIONS_SEND_METADATA = {
  name: 'send',
  summary: 'Send a provider-backed turn to a Session',
  description: 'Start a provider-backed turn for an existing Session and print the normalized turn state.',
  owner: '@pawrrtal/cli/Modules/Agent',
  arguments: [
    { name: 'session-id', description: 'Existing Session id', kind: 'string', required: true },
    { name: 'message', description: 'User message to send', kind: 'string', required: true },
  ],
  flags: [
    ...AUTOMATION_FLAG_METADATA,
    { name: 'provider', description: 'Provider override for this turn', kind: 'string' },
  ],
  examples: [
    { command: 'paw sessions send 00000000-0000-4000-8000-000000000001 "hello"', description: 'Run one turn' },
  ],
  environment: [{ name: 'PAW_BACKEND_URL', purpose: 'Backend target used for Session turns' }],
  outputModes: ['human', 'json', 'plain'],
  structuredOutputs: [
    {
      mode: 'json',
      contract: 'AgentTurnRead',
      description: 'Schema-backed provider turn state.',
    },
  ],
  exitCodes: [ExitCode.success, ExitCode.usage, ExitCode.external, ExitCode.verification],
} satisfies CommandMetadata;

const SESSIONS_EVENTS_METADATA = {
  name: 'events',
  summary: 'Read normalized events for a turn',
  description: 'Read normalized provider events emitted for one Session turn.',
  owner: '@pawrrtal/cli/Modules/Agent',
  arguments: [
    { name: 'session-id', description: 'Existing Session id', kind: 'string', required: true },
    { name: 'turn-id', description: 'Turn id to inspect', kind: 'string', required: true },
  ],
  flags: [
    ...AUTOMATION_FLAG_METADATA,
    { name: 'follow', description: 'Poll until the turn reaches a terminal state', kind: 'boolean' },
  ],
  examples: [
    {
      command: 'paw sessions events 00000000-0000-4000-8000-000000000001 00000000-0000-4000-8000-000000000002',
      description: 'Read normalized turn events',
    },
  ],
  environment: [{ name: 'PAW_BACKEND_URL', purpose: 'Backend target used for Session event reads' }],
  outputModes: ['human', 'json', 'plain'],
  structuredOutputs: [
    {
      mode: 'json',
      contract: 'AgentProviderEventRead[]',
      description: 'Schema-backed normalized provider events.',
    },
  ],
  exitCodes: [ExitCode.success, ExitCode.usage, ExitCode.external, ExitCode.verification],
} satisfies CommandMetadata;

const SESSIONS_CANCEL_METADATA = {
  name: 'cancel-turn',
  summary: 'Cancel an active provider turn',
  description: 'Request cancellation for an active provider-backed Session turn.',
  owner: '@pawrrtal/cli/Modules/Agent',
  arguments: [
    { name: 'session-id', description: 'Existing Session id', kind: 'string', required: true },
    { name: 'turn-id', description: 'Turn id to cancel', kind: 'string', required: true },
  ],
  flags: [
    ...AUTOMATION_FLAG_METADATA,
    { name: 'reason', description: 'Safe cancellation reason', kind: 'string' },
  ],
  examples: [
    {
      command:
        'paw sessions cancel-turn 00000000-0000-4000-8000-000000000001 00000000-0000-4000-8000-000000000002 --reason "operator requested"',
      description: 'Cancel one active provider turn',
    },
  ],
  environment: [{ name: 'PAW_BACKEND_URL', purpose: 'Backend target used for Session cancellation' }],
  outputModes: ['human', 'json', 'plain'],
  structuredOutputs: [
    {
      mode: 'json',
      contract: 'AgentTurnRead',
      description: 'Schema-backed provider turn state after cancellation.',
    },
  ],
  exitCodes: [ExitCode.success, ExitCode.usage, ExitCode.external, ExitCode.verification],
} satisfies CommandMetadata;

const SESSIONS_METADATA = {
  name: 'sessions',
  summary: 'Operate provider-backed Sessions',
  description: 'Start turns and read normalized provider events through the public Pawrrtal API.',
  owner: '@pawrrtal/cli/Modules/Agent',
  subcommands: [SESSIONS_SEND_METADATA, SESSIONS_EVENTS_METADATA, SESSIONS_CANCEL_METADATA],
  examples: [{ command: 'paw sessions send <session-id> "hello"', description: 'Start a provider-backed turn' }],
  environment: [{ name: 'PAW_BACKEND_URL', purpose: 'Backend target used for Session commands' }],
  outputModes: ['human'],
  exitCodes: [ExitCode.success, ExitCode.usage, ExitCode.external, ExitCode.verification],
} satisfies CommandMetadata;

const SessionsSendCommand = {
  command: applyCommandMetadata(Command.make('send', sendFlags, handleSend), SESSIONS_SEND_METADATA),
  metadata: SESSIONS_SEND_METADATA,
} satisfies CommandModule<
  'send',
  SessionsSendOptions,
  EmptyCommandContext,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
>;

const SessionsEventsCommand = {
  command: applyCommandMetadata(Command.make('events', eventsFlags, handleEvents), SESSIONS_EVENTS_METADATA),
  metadata: SESSIONS_EVENTS_METADATA,
} satisfies CommandModule<
  'events',
  SessionsEventsOptions,
  EmptyCommandContext,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
>;

const SessionsCancelCommand = {
  command: applyCommandMetadata(Command.make('cancel-turn', cancelFlags, handleCancel), SESSIONS_CANCEL_METADATA),
  metadata: SESSIONS_CANCEL_METADATA,
} satisfies CommandModule<
  'cancel-turn',
  SessionsCancelOptions,
  EmptyCommandContext,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
>;

/** Command group for provider-backed Sessions. */
export const SessionsCommand = {
  command: applyCommandMetadata(
    Command.make('sessions').pipe(
      Command.withSubcommands([SessionsSendCommand.command, SessionsEventsCommand.command, SessionsCancelCommand.command])
    ),
    SESSIONS_METADATA
  ),
  metadata: SESSIONS_METADATA,
} satisfies CommandModule<
  'sessions',
  EmptyCommandContext,
  EmptyCommandContext,
  UsageError | ExternalError | VerificationError,
  ActiveCliContext
>;

/** Sends one provider-backed turn to an existing Session. */
function handleSend(
  options: SessionsSendOptions
): Effect.Effect<void, UsageError | ExternalError | VerificationError, ActiveCliContext> {
  return Effect.gen(function* () {
    const mode = yield* resolveOutputMode(options);
    const sessionId = yield* decodeCliValue(Ids.session, options.session, 'Session id is not valid.');
    const providerId = yield* Option.match(options.provider, {
      onNone: () => Effect.succeed(null),
      onSome: (provider) => decodeCliValue(Ids.provider, provider, 'Provider id is not valid.'),
    });
    const payload = new AgentTurnCreateInput({
      sessionId,
      workspaceId: null,
      providerId,
      message: options.message,
    });
    const turn = yield* requestJson('POST', `/sessions/${sessionId}/agent-turns/`, AgentTurnRead, JSON.stringify(payload));
    const output = yield* formatOutput(turn, mode, turnFormatters);
    yield* Console.log(output);
  });
}

/** Reads normalized events for one provider-backed turn. */
function handleEvents(
  options: SessionsEventsOptions
): Effect.Effect<void, UsageError | ExternalError | VerificationError, ActiveCliContext> {
  return Effect.gen(function* () {
    const mode = yield* resolveOutputMode(options);
    const sessionId = yield* decodeCliValue(Ids.session, options.session, 'Session id is not valid.');
    const turnId = yield* decodeCliValue(Ids.agentTurn, options.turn, 'Turn id is not valid.');
    const events = options.follow
      ? yield* readEventsUntilTerminal(sessionId, turnId, 10)
      : yield* readTurnEvents(sessionId, turnId);
    const output = yield* formatOutput(events, mode, eventsFormatters);
    yield* Console.log(output);
  });
}

/** Requests cancellation for one active provider turn. */
function handleCancel(
  options: SessionsCancelOptions
): Effect.Effect<void, UsageError | ExternalError | VerificationError, ActiveCliContext> {
  return Effect.gen(function* () {
    const mode = yield* resolveOutputMode(options);
    const sessionId = yield* decodeCliValue(Ids.session, options.session, 'Session id is not valid.');
    const turnId = yield* decodeCliValue(Ids.agentTurn, options.turn, 'Turn id is not valid.');
    const reason = Option.getOrNull(options.reason);
    const payload = new AgentCancellationInput({ reason });
    const turn = yield* requestJson(
      'POST',
      `/sessions/${sessionId}/agent-turns/${turnId}/cancel`,
      AgentTurnRead,
      JSON.stringify(payload)
    );
    const output = yield* formatOutput(turn, mode, turnFormatters);
    yield* Console.log(output);
  });
}

/** Reads normalized events once for a provider-backed turn. */
function readTurnEvents(
  sessionId: AgentTurnRead['sessionId'],
  turnId: AgentTurnRead['turnId']
): Effect.Effect<ReadonlyArray<AgentProviderEventRead>, UsageError | ExternalError | VerificationError, ActiveCliContext> {
  return requestJson('GET', `/sessions/${sessionId}/agent-turns/${turnId}/events`, Schema.Array(AgentProviderEventRead));
}

/** Polls turn events until a terminal public state is visible or polling stops. */
function readEventsUntilTerminal(
  sessionId: AgentTurnRead['sessionId'],
  turnId: AgentTurnRead['turnId'],
  remainingPolls: number
): Effect.Effect<ReadonlyArray<AgentProviderEventRead>, UsageError | ExternalError | VerificationError, ActiveCliContext> {
  return Effect.gen(function* () {
    const events = yield* readTurnEvents(sessionId, turnId);
    const turn = yield* requestJson('GET', `/sessions/${sessionId}/agent-turns/${turnId}`, AgentTurnRead);
    if (remainingPolls <= 0 || isTerminalState(turn.state)) {
      return events;
    }
    yield* Effect.sleep('250 millis');
    return yield* readEventsUntilTerminal(sessionId, turnId, remainingPolls - 1);
  });
}

/** Checks whether a turn no longer has active provider work. */
function isTerminalState(state: AgentTurnRead['state']): boolean {
  return state === 'complete' || state === 'failed' || state === 'cancelled' || state === 'stale';
}

const turnFormatters = {
  human: (turn: AgentTurnRead): string =>
    [`Turn: ${turn.turnId}`, `Session: ${turn.sessionId}`, `Provider: ${turn.providerId}`, `State: ${turn.state}`].join('\n'),
  json: {
    schema: AgentTurnRead,
    render: (turn: AgentTurnRead): AgentTurnRead => turn,
  },
  plain: (turn: AgentTurnRead): string => `${turn.turnId}\t${turn.sessionId}\t${turn.providerId}\t${turn.state}`,
};

const eventsFormatters = {
  human: (events: ReadonlyArray<AgentProviderEventRead>): string =>
    events.map((event) => `${event.sequence}\t${event.type}\t${event.visibility}`).join('\n'),
  json: {
    schema: Schema.Array(AgentProviderEventRead),
    render: (events: ReadonlyArray<AgentProviderEventRead>): ReadonlyArray<AgentProviderEventRead> => events,
  },
  plain: (events: ReadonlyArray<AgentProviderEventRead>): string =>
    events.map((event) => `${event.sequence}\t${event.type}\t${event.visibility}`).join('\n'),
};

/** Decodes one CLI argument through its canonical domain schema. */
function decodeCliValue<S extends Schema.Constraint>(
  schema: S,
  value: S['Encoded'],
  message: string
): Effect.Effect<S['Type'], VerificationError | UsageError, S['DecodingServices']> {
  return Schema.decodeEffect(schema)(value).pipe(
    Effect.mapError(
      (schemaError) =>
        new VerificationError({
          message,
          hint: 'Check the command usage and pass a value that matches the public contract.',
          details: String(schemaError),
        })
    )
  );
}
