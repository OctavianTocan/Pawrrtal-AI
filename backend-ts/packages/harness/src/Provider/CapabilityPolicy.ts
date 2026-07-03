/** Host-owned capability policy helpers for provider turns. */

import type { CapabilityBoundaryId, CapabilityId } from '@pawrrtal/domain-core';
import { Ids } from '@pawrrtal/domain-core';
import { CapabilityDecisionRead } from '@pawrrtal/domain-core/Modules/AgentTurns/Domain';
import { Effect, Schema } from 'effect';

export const ShellCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('shell');
export const ProviderNativeCapabilityId: CapabilityId = Schema.decodeSync(Ids.capability)('provider-native-action');
const RestrictedCapabilityBoundaryId: CapabilityBoundaryId = Schema.decodeSync(Ids.capabilityBoundary)('restricted');

/** Decoded prompt and boundary input for host capability evaluation. */
export class CapabilityPolicyInput extends Schema.Class<CapabilityPolicyInput>('CapabilityPolicyInput')(
  {
    /** Capability boundary selected for this turn. */
    capabilityBoundaryId: Ids.capabilityBoundary,
    /** User prompt being evaluated before provider start. */
    prompt: Schema.String
  },
  {
    identifier: 'CapabilityPolicyInput',
    title: 'CapabilityPolicyInput',
    description: 'Input used by Pawrrtal host policy before provider execution.'
  }
) {}

/** Creates one explicit capability decision. */
const decision = (
  capabilityId: CapabilityId,
  input: CapabilityPolicyInput,
  capabilityDecision: CapabilityDecisionRead['decision'],
  reason: string
): CapabilityDecisionRead =>
  new CapabilityDecisionRead({
    capabilityId,
    decision: capabilityDecision,
    reason: `${input.capabilityBoundaryId}: ${reason}`
  });

/** Checks whether a prompt requests shell or command execution. */
const asksForShell = (prompt: string): boolean => {
  const lowered = prompt.toLowerCase();
  return lowered.includes('shell') || lowered.includes('command') || lowered.includes('terminal');
};

/** Checks whether a prompt requests provider-native behavior outside Pawrrtal. */
const asksForProviderNative = (prompt: string): boolean => {
  const lowered = prompt.toLowerCase();
  return lowered.includes('provider-native') || lowered.includes('slash command');
};

/**
 * Evaluates the first capability decision implied by a prompt.
 *
 * @param input - Prompt and boundary id to evaluate.
 * @returns Explicit decision when the host policy recognizes a capability request.
 */
export function evaluateTurnPromptCapability(
  input: CapabilityPolicyInput
): Effect.Effect<CapabilityDecisionRead | null> {
  if (asksForShell(input.prompt)) {
    return Effect.succeed(
      input.capabilityBoundaryId === RestrictedCapabilityBoundaryId
        ? decision(ShellCapabilityId, input, 'denied', 'Shell access is denied for this boundary.')
        : decision(ShellCapabilityId, input, 'allowed', 'Shell access is allowed for this boundary.')
    );
  }

  if (asksForProviderNative(input.prompt)) {
    return Effect.succeed(
      decision(
        ProviderNativeCapabilityId,
        input,
        'unsupported',
        'Provider-native actions must use Pawrrtal host flows.'
      )
    );
  }

  return Effect.succeed(null);
}
