import { describe, expect, it } from 'vitest';
import { INTEGRATION_CATALOG, YOUR_INTEGRATIONS } from './catalog';

describe('integrations catalog', () => {
	it('lists every YOUR_INTEGRATIONS entry as installed in the catalog', () => {
		for (const integration of YOUR_INTEGRATIONS) {
			const catalogEntry = INTEGRATION_CATALOG.find((entry) => entry.id === integration.id);
			expect(catalogEntry).toBeDefined();
			expect(catalogEntry?.state).toBe('installed');
		}
	});

	it('keeps every catalog ID unique', () => {
		const ids = INTEGRATION_CATALOG.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('only marks third-party integrations as connectable', () => {
		const connectables = INTEGRATION_CATALOG.filter((entry) => entry.state === 'connectable');
		expect(connectables.length).toBeGreaterThan(0);
		// None of the connectable rows should overlap with installed user integrations.
		const installedIds = new Set(YOUR_INTEGRATIONS.map((entry) => entry.id));
		for (const entry of connectables) {
			expect(installedIds.has(entry.id)).toBe(false);
		}
	});
});
