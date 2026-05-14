import { describe, expect, it } from 'vitest';
import { isCanonicalModelId } from './is-canonical-model-id';

describe('isCanonicalModelId', (): void => {
	it('accepts host-prefixed canonical', (): void => {
		expect(isCanonicalModelId('agent-sdk:anthropic/claude-sonnet-4-6')).toBe(true);
	});

	it('accepts vendor-only form', (): void => {
		expect(isCanonicalModelId('anthropic/claude-sonnet-4-6')).toBe(true);
	});

	it('rejects bare slug', (): void => {
		expect(isCanonicalModelId('claude-sonnet-4-6')).toBe(false);
	});

	it('rejects empty string', (): void => {
		expect(isCanonicalModelId('')).toBe(false);
	});

	it('rejects whitespace', (): void => {
		expect(isCanonicalModelId('anthropic / claude-sonnet-4-6')).toBe(false);
	});

	it('rejects non-strings', (): void => {
		expect(isCanonicalModelId(undefined)).toBe(false);
		expect(isCanonicalModelId(null)).toBe(false);
		expect(isCanonicalModelId(123)).toBe(false);
	});
});
