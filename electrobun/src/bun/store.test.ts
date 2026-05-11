/**
 * Tests for the lightweight JSON file store that replaces electron-store
 * in the Electrobun shell.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Store, createStore } from './store';

let testDir: string;

beforeEach(() => {
	testDir = path.join(tmpdir(), `pawrrtal-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(testDir, { recursive: true });
});

describe('Store', () => {
	it('returns defaults when the file does not exist', () => {
		const store = new Store({ name: 'test', defaults: { count: 0, label: 'hello' }, dataDir: testDir });
		expect(store.get('count')).toBe(0);
		expect(store.get('label')).toBe('hello');
	});

	it('persists a value and reads it back', () => {
		const store = new Store({ name: 'persist', defaults: { roots: [] as string[] }, dataDir: testDir });
		store.set('roots', ['/home/user/work']);
		expect(store.get('roots')).toEqual(['/home/user/work']);
	});

	it('survives re-instantiation (reads from disk)', () => {
		const opts = { name: 'survive', defaults: { x: 0 }, dataDir: testDir };
		const s1 = new Store(opts);
		s1.set('x', 42);

		const s2 = new Store(opts);
		expect(s2.get('x')).toBe(42);
	});

	it('writes valid JSON to disk', () => {
		const store = new Store({ name: 'json', defaults: { flag: false }, dataDir: testDir });
		store.set('flag', true);
		const raw = readFileSync(path.join(testDir, 'json.json'), 'utf-8');
		const parsed = JSON.parse(raw);
		expect(parsed.flag).toBe(true);
	});

	it('merges file contents with defaults (file wins on key overlap)', () => {
		const store1 = new Store({
			name: 'merge',
			defaults: { a: 1, b: 2 },
			dataDir: testDir,
		});
		store1.set('a', 99);

		const store2 = new Store({
			name: 'merge',
			defaults: { a: 1, b: 2, c: 3 },
			dataDir: testDir,
		});
		expect(store2.get('a')).toBe(99); // from disk
		expect(store2.get('b')).toBe(2);   // default (not in file)
		expect(store2.get('c')).toBe(3);   // new default
	});

	it('handles malformed JSON by falling back to defaults', () => {
		const filePath = path.join(testDir, 'broken.json');
		require('node:fs').writeFileSync(filePath, '{ not valid json', 'utf-8');
		const store = new Store({ name: 'broken', defaults: { ok: true }, dataDir: testDir });
		expect(store.get('ok')).toBe(true);
	});

	it('_resetToDefaults clears in-memory state without touching disk', () => {
		const store = new Store({ name: 'reset', defaults: { n: 0 }, dataDir: testDir });
		store.set('n', 7);
		store._resetToDefaults({ n: 0 });
		expect(store.get('n')).toBe(0);
		// Disk still has the old value
		const raw = JSON.parse(readFileSync(path.join(testDir, 'reset.json'), 'utf-8'));
		expect(raw.n).toBe(7);
	});
});

describe('createStore factory', () => {
	it('returns a Store instance', () => {
		const store = createStore({ name: 'factory', defaults: { v: 1 }, dataDir: testDir });
		expect(store).toBeInstanceOf(Store);
		expect(store.get('v')).toBe(1);
	});
});
