import { describe, expect, it } from 'vitest';
import { CONVERSATION_DRAG_MIME, PROJECTS_STORAGE_KEYS } from './constants';

describe('projects constants', () => {
	it('uses the project-namespaced collapsed-projects key', () => {
		expect(PROJECTS_STORAGE_KEYS.collapsedProjects).toBe('projects:collapsed');
	});

	it('publishes a unique custom MIME type for the chat drag payload', () => {
		expect(CONVERSATION_DRAG_MIME).toBe('application/x-pawrrtal-conversation');
		// The MIME type must NOT collide with anything the browser uses by
		// default for plain text / URI drags — assert the prefix.
		expect(CONVERSATION_DRAG_MIME.startsWith('application/')).toBe(true);
	});
});
