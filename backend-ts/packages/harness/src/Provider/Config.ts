/** Effect Config values for provider registry composition. */

import { Config, Option, Schema } from 'effect';
import { DeterministicProviderScenario } from './InternalDomain';

/** Decoded deterministic provider configuration. */
export class DeterministicProviderConfig extends Schema.Class<DeterministicProviderConfig>(
  'DeterministicProviderConfig'
)(
  {
    /** Whether the deterministic provider is registered. */
    enabled: Schema.Boolean,
    /** Deterministic behavior used by conformance and CI runs. */
    scenario: DeterministicProviderScenario
  },
  {
    identifier: 'DeterministicProviderConfig',
    title: 'DeterministicProviderConfig',
    description: 'Config decoded for the deterministic provider.'
  }
) {}

/** Config source for the deterministic provider. */
export const deterministicProviderConfig: Config.Config<DeterministicProviderConfig> = Config.all({
  enabled: Config.boolean('PAW_PROVIDER_DETERMINISTIC_ENABLED').pipe(Config.withDefault(true)),
  scenario: Config.schema(DeterministicProviderScenario, 'PAW_PROVIDER_DETERMINISTIC_SCENARIO').pipe(
    Config.withDefault('success')
  )
}).pipe(Config.map((input) => new DeterministicProviderConfig(input)));

/** Decoded Claude Agent SDK provider configuration. */
export class ClaudeAgentSdkProviderConfig extends Schema.Class<ClaudeAgentSdkProviderConfig>(
  'ClaudeAgentSdkProviderConfig'
)(
  {
    /** Whether the Claude Agent SDK provider can start turns. */
    enabled: Schema.Boolean,
    /** Claude model override, or null for the Claude Code default. */
    model: Schema.NullOr(Schema.String),
    /** Session working directory override, or null for the process directory. */
    cwd: Schema.NullOr(Schema.String),
    /** Claude Code executable override, or null for SDK discovery. */
    pathToClaudeCodeExecutable: Schema.NullOr(Schema.String)
  },
  {
    identifier: 'ClaudeAgentSdkProviderConfig',
    title: 'ClaudeAgentSdkProviderConfig',
    description: 'Config decoded for the Claude Agent SDK provider.'
  }
) {}

/** Normalizes optional text config so blank values behave like missing values. */
const optionalText = (name: string): Config.Config<string | null> =>
  Config.option(Config.string(name)).pipe(
    Config.map((value) => {
      const text = Option.getOrNull(value);
      if (text === null) {
        return null;
      }
      const trimmed = text.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
  );

/** Config source for the Claude Agent SDK provider. */
export const claudeAgentSdkProviderConfig: Config.Config<ClaudeAgentSdkProviderConfig> = Config.all({
  enabled: Config.boolean('PAW_PROVIDER_CLAUDE_AGENT_SDK_ENABLED').pipe(Config.withDefault(false)),
  model: optionalText('PAW_PROVIDER_CLAUDE_AGENT_SDK_MODEL'),
  cwd: optionalText('PAW_PROVIDER_CLAUDE_AGENT_SDK_CWD'),
  pathToClaudeCodeExecutable: optionalText('PAW_PROVIDER_CLAUDE_AGENT_SDK_EXECUTABLE')
}).pipe(Config.map((input) => new ClaudeAgentSdkProviderConfig(input)));
