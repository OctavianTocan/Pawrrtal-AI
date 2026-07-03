/** Claude Agent SDK provider adapter for the provider harness contract. */

import type { Options, Query, SDKMessage, SDKResultError } from '@anthropic-ai/claude-agent-sdk';
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import type { AgentProviderEventId, CapabilityId, ProviderId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import {
  AgentProviderDiagnosticRead,
  AgentProviderRead,
  AgentProviderSetupRequirementRead,
  ProviderCapabilityManifestRead
} from '@pawrrtal/domain-core/Modules/AgentProviders/Domain';
import {
  AgentProviderEventRead,
  AgentTurnFailureRead,
  CapabilityDeniedEventPayload,
  DiagnosticEventPayload,
  TextEventPayload
} from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { DateTime, Effect, Schema, Stream } from 'effect';
import type { ClaudeAgentSdkProviderConfig } from '../Provider/Config';
import type { AgentProvider, AgentQuery } from '../Provider/Contract';
import {
  ProviderCancellationError,
  ProviderInputError,
  ProviderStartError,
  ProviderStreamError
} from '../Provider/Errors';
import type {
  ContinuationRotationInput,
  ProviderCancellationReason,
  ProviderFollowUpInput,
  ProviderQueryInput
} from '../Provider/InternalDomain';
import { ContinuationRotationDecision } from '../Provider/InternalDomain';

export const ClaudeAgentSdkProviderId: ProviderId = Schema.decodeSync(Ids.provider)('claude-agent-sdk');

const SDK_PERMISSION_CAPABILITY: CapabilityId = Schema.decodeSync(Ids.capability)('provider-sdk-permission');

/** Public definition for the Claude Agent SDK provider. */
const makeDefinition = (config: ClaudeAgentSdkProviderConfig): AgentProviderRead =>
  new AgentProviderRead({
    providerId: ClaudeAgentSdkProviderId,
    displayName: 'Claude Agent SDK',
    kind: 'sdk',
    version: '0.3.200',
    readiness: config.enabled ? 'ready' : 'missingSetup',
    capabilities: new ProviderCapabilityManifestRead({
      streaming: true,
      followUps: 'nextTurnOnly',
      cancellation: 'native',
      resume: 'native',
      nativeSlashCommands: false,
      tools: 'provider',
      userQuestions: 'blocked',
      workspaceInjection: ['systemPrompt', 'files', 'mcp', 'providerNative'],
      eventTypes: [
        'turn.started',
        'activity',
        'progress',
        'capability.denied',
        'diagnostic',
        'error',
        'answer.completed',
        'turn.completed'
      ]
    }),
    continuation: 'native',
    setupRequirements: [
      new AgentProviderSetupRequirementRead({
        key: 'enabled',
        label: 'Claude Agent SDK provider enabled',
        isSatisfied: config.enabled,
        remediation: config.enabled ? null : 'Set PAW_PROVIDER_CLAUDE_AGENT_SDK_ENABLED=true.'
      })
    ],
    diagnostics: [
      new AgentProviderDiagnosticRead({
        key: 'model',
        value: config.model ?? 'claude-code-default',
        isRedacted: false
      }),
      new AgentProviderDiagnosticRead({
        key: 'cwd',
        value: config.cwd ?? 'process-cwd',
        isRedacted: true
      }),
      new AgentProviderDiagnosticRead({
        key: 'executable',
        value: config.pathToClaudeCodeExecutable === null ? 'sdk-discovery' : 'configured',
        isRedacted: true
      })
    ]
  });

/** Decodes a fresh UUID as a normalized provider event id. */
const makeEventId = (): AgentProviderEventId => Schema.decodeSync(Ids.event)(crypto.randomUUID());

/** Builds one normalized event with Effect-managed time. */
const makeEvent = (input: {
  readonly turnId: ProviderQueryInput['turnId'];
  readonly sequence: number;
  readonly type: AgentProviderEventRead['type'];
  readonly visibility: AgentProviderEventRead['visibility'];
  readonly payload: AgentProviderEventRead['payload'];
}): Effect.Effect<AgentProviderEventRead> =>
  Effect.gen(function* () {
    const now = yield* DateTime.now;
    return new AgentProviderEventRead({
      eventId: makeEventId(),
      turnId: input.turnId,
      sequence: input.sequence,
      type: input.type,
      visibility: input.visibility,
      payload: input.payload,
      createdAt: now
    });
  });

/** Produces SDK query options from decoded provider config. */
const makeSdkOptions = (config: ClaudeAgentSdkProviderConfig, abortController: AbortController): Options => ({
  abortController,
  permissionMode: 'dontAsk',
  persistSession: true,
  includePartialMessages: true,
  promptSuggestions: false,
  maxTurns: 1,
  ...(config.model === null ? {} : { model: config.model }),
  ...(config.cwd === null ? {} : { cwd: config.cwd }),
  ...(config.pathToClaudeCodeExecutable === null
    ? {}
    : { pathToClaudeCodeExecutable: config.pathToClaudeCodeExecutable })
});

/** Builds safe activity text for an SDK message. */
const messageSummary = (message: SDKMessage): string => {
  if ('subtype' in message) {
    return `Claude SDK emitted ${message.type}:${message.subtype}.`;
  }
  return `Claude SDK emitted ${message.type}.`;
};

/** Turns an SDK execution error into a typed stream failure. */
const failSdkResult = (message: SDKResultError): Effect.Effect<never, ProviderStreamError> =>
  Effect.fail(
    new ProviderStreamError({
      detail: message.errors[0] ?? 'Claude Agent SDK returned an execution error.',
      providerId: ClaudeAgentSdkProviderId,
      safeNextAction: 'Check Claude Agent SDK authentication, quota, and runtime setup.'
    })
  );

/** Maps one SDK message into normalized Pawrrtal provider events. */
const normalizeSdkMessage = (
  input: ProviderQueryInput,
  sequence: number,
  message: SDKMessage
): Effect.Effect<readonly [state: number, values: ReadonlyArray<AgentProviderEventRead>], ProviderStreamError> =>
  Effect.gen(function* () {
    if (message.type === 'result' && message.subtype !== 'success') {
      return yield* failSdkResult(message);
    }

    if (message.type === 'result') {
      const answer = yield* makeEvent({
        turnId: input.turnId,
        sequence,
        type: 'answer.completed',
        visibility: 'user',
        payload: new TextEventPayload({ text: message.result })
      });
      const completed = yield* makeEvent({
        turnId: input.turnId,
        sequence: sequence + 1,
        type: 'turn.completed',
        visibility: 'operator',
        payload: new TextEventPayload({ text: 'Claude Agent SDK completed the turn.' })
      });
      return [sequence + 2, [answer, completed]] as const;
    }

    if (message.type === 'system' && message.subtype === 'init') {
      const started = yield* makeEvent({
        turnId: input.turnId,
        sequence,
        type: 'turn.started',
        visibility: 'operator',
        payload: new DiagnosticEventPayload({
          summary: `Claude Code ${message.claude_code_version} initialized with ${message.model}.`,
          isRedacted: true
        })
      });
      return [sequence + 1, [started]] as const;
    }

    if (message.type === 'system' && message.subtype === 'permission_denied') {
      const denied = yield* makeEvent({
        turnId: input.turnId,
        sequence,
        type: 'capability.denied',
        visibility: 'user',
        payload: new CapabilityDeniedEventPayload({
          capabilityId: SDK_PERMISSION_CAPABILITY,
          decision: 'denied',
          reason: message.decision_reason ?? `Claude denied ${message.tool_name}.`,
          safeNextAction: 'Change the Workspace capability policy before retrying this turn.'
        })
      });
      return [sequence + 1, [denied]] as const;
    }

    if (message.type === 'system' && message.subtype === 'api_retry') {
      const retry = yield* makeEvent({
        turnId: input.turnId,
        sequence,
        type: 'progress',
        visibility: 'operator',
        payload: new DiagnosticEventPayload({
          summary: `Claude SDK retry ${message.attempt}/${message.max_retries}.`,
          isRedacted: true
        })
      });
      return [sequence + 1, [retry]] as const;
    }

    if (message.type === 'rate_limit_event') {
      const rateLimit = yield* makeEvent({
        turnId: input.turnId,
        sequence,
        type: 'progress',
        visibility: 'operator',
        payload: new DiagnosticEventPayload({
          summary: `Claude rate-limit status: ${message.rate_limit_info.status}.`,
          isRedacted: true
        })
      });
      return [sequence + 1, [rateLimit]] as const;
    }

    if (message.type === 'assistant' && message.error) {
      const error = yield* makeEvent({
        turnId: input.turnId,
        sequence,
        type: 'error',
        visibility: 'operator',
        payload: new AgentTurnFailureRead({
          code: message.error,
          message: `Claude SDK assistant error: ${message.error}.`,
          safeNextAction: 'Inspect provider diagnostics and retry when setup is healthy.'
        })
      });
      return [sequence + 1, [error]] as const;
    }

    const activity = yield* makeEvent({
      turnId: input.turnId,
      sequence,
      type: 'activity',
      visibility: 'operator',
      payload: new DiagnosticEventPayload({
        summary: messageSummary(message),
        isRedacted: true
      })
    });
    return [sequence + 1, [activity]] as const;
  });

/** Converts the SDK async generator into a normalized Effect stream. */
const normalizeSdkStream = (
  input: ProviderQueryInput,
  sdkQuery: Query
): Stream.Stream<AgentProviderEventRead, ProviderStreamError> =>
  Stream.fromAsyncIterable(
    sdkQuery,
    () =>
      new ProviderStreamError({
        detail: 'Claude Agent SDK stream failed.',
        providerId: ClaudeAgentSdkProviderId,
        safeNextAction: 'Check Claude Agent SDK runtime logs and retry.'
      })
  ).pipe(
    Stream.mapAccumEffect(
      () => 1,
      (sequence, message) => normalizeSdkMessage(input, sequence, message)
    ),
    Stream.withSpan('ClaudeAgentSdk.events', {
      attributes: {
        providerId: ClaudeAgentSdkProviderId,
        sessionId: input.sessionId,
        turnId: input.turnId
      }
    })
  );

/** Starts a Claude Agent SDK query from decoded harness input. */
const makeQuery = (
  config: ClaudeAgentSdkProviderConfig,
  input: ProviderQueryInput
): Effect.Effect<AgentQuery, ProviderStartError> =>
  Effect.gen(function* () {
    if (!config.enabled) {
      return yield* Effect.fail(
        new ProviderStartError({
          detail: 'Claude Agent SDK provider is not enabled.',
          providerId: ClaudeAgentSdkProviderId,
          safeNextAction: 'Set PAW_PROVIDER_CLAUDE_AGENT_SDK_ENABLED=true.'
        })
      );
    }

    const abortController = new AbortController();
    const sdkQuery = yield* Effect.try({
      try: () => claudeQuery({ prompt: input.prompt, options: makeSdkOptions(config, abortController) }),
      catch: () =>
        new ProviderStartError({
          detail: 'Claude Agent SDK could not start a query.',
          providerId: ClaudeAgentSdkProviderId,
          safeNextAction: 'Check Claude Code installation, authentication, and provider config.'
        })
    });

    return {
      push: (_input: ProviderFollowUpInput) =>
        Effect.fail(
          new ProviderInputError({
            detail: 'Active Claude follow-up input is implemented by the next session-runner slice.',
            providerId: ClaudeAgentSdkProviderId,
            safeNextAction: 'Send a new turn after this turn completes.'
          })
        ),
      endInput: Effect.void,
      events: normalizeSdkStream(input, sdkQuery),
      abort: (_reason: ProviderCancellationReason) =>
        Effect.tryPromise({
          try: () => sdkQuery.interrupt(),
          catch: () =>
            new ProviderCancellationError({
              detail: 'Claude Agent SDK interruption failed.',
              providerId: ClaudeAgentSdkProviderId,
              safeNextAction: 'Close the active query and mark the turn cancelled.'
            })
        })
    } as const;
  }).pipe(
    Effect.withSpan('ClaudeAgentSdk.query', {
      attributes: {
        providerId: ClaudeAgentSdkProviderId,
        sessionId: input.sessionId,
        turnId: input.turnId
      }
    }),
    Effect.annotateLogs({
      providerId: ClaudeAgentSdkProviderId,
      sessionId: input.sessionId,
      turnId: input.turnId
    })
  );

/** Creates the Claude Agent SDK provider adapter. */
export const makeClaudeAgentSdkProvider = (config: ClaudeAgentSdkProviderConfig): AgentProvider => ({
  providerId: ClaudeAgentSdkProviderId,
  describe: Effect.succeed(makeDefinition(config)),
  query: (input: ProviderQueryInput) => makeQuery(config, input),
  isSessionInvalid: (failure) => failure._tag === 'ProviderContinuationError',
  maybeRotateContinuation: (_input: ContinuationRotationInput) =>
    Effect.succeed(
      new ContinuationRotationDecision({
        action: 'reuse',
        reason: 'Claude Agent SDK native continuation can be reused.',
        nextFingerprint: null
      })
    )
});
