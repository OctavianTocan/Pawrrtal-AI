import { describe, expect, it } from 'vitest';
import { SIDEBAR_STORAGE_KEYS } from './storage-keys';

describe('lib/storage-keys', () => {
	it('exposes the canonical sidebar localStorage keys', () => {
		expect(SIDEBAR_STORAGE_KEYS.state).toBe('sidebar_state');
		expect(SIDEBAR_STORAGE_KEYS.width).toBe('sidebar_width');
	});

	it('keeps every key value unique', () => {
		const values = Object.values(SIDEBAR_STORAGE_KEYS);
		expect(new Set(values).size).toBe(values.length);
	});
});
