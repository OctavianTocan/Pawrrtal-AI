import { describe, expect, it, vi } from 'vitest';
import {
  buildConversationGroups,
  countGroupItems,
  filterConversationGroups,
} from './conversation-groups';
import type { Conversation } from './types';

function makeConversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: overrides.id ?? 'conversation-1',
    user_id: overrides.user_id ?? 'user-1',
    title: overrides.title ?? 'Untitled',
    created_at: overrides.created_at ?? '2026-05-01T09:00:00.000Z',
    updated_at: overrides.updated_at ?? overrides.created_at ?? '2026-05-01T09:00:00.000Z',
    is_archived: overrides.is_archived ?? false,
    is_flagged: overrides.is_flagged ?? false,
    is_unread: overrides.is_unread ?? false,
    status: overrides.status ?? null,
  };
}

describe('conversation grouping helpers', (): void => {
  it('sorts conversations newest first inside day groups', (): void => {
    vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));

    const groups = buildConversationGroups([
      makeConversation({
        id: 'older',
        title: 'Older today',
        updated_at: '2026-05-03T08:00:00.000Z',
      }),
      makeConversation({
        id: 'yesterday',
        title: 'Yesterday',
        updated_at: '2026-05-02T08:00:00.000Z',
      }),
      makeConversation({
        id: 'newer',
        title: 'Newer today',
        updated_at: '2026-05-03T11:00:00.000Z',
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe('Today');
    expect(groups[0]?.items.map((conversation) => conversation.id)).toEqual(['newer', 'older']);
    expect(groups[1]?.label).toBe('Yesterday');
  });

  it('falls back to created_at when updated_at is invalid', (): void => {
    vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));

    const groups = buildConversationGroups([
      makeConversation({
        id: 'fallback',
        created_at: '2026-05-03T10:00:00.000Z',
        updated_at: 'not-a-date',
      }),
    ]);

    expect(groups[0]?.label).toBe('Today');
    expect(groups[0]?.items[0]?.id).toBe('fallback');
  });

  it('filters groups by case-insensitive title and ignores one-character queries', (): void => {
    const groups = buildConversationGroups([
      makeConversation({ id: 'alpha', title: 'Alpha plan' }),
      makeConversation({ id: 'beta', title: 'Beta notes' }),
    ]);

    expect(filterConversationGroups(groups, 'a')).toBe(groups);
    expect(filterConversationGroups(groups, 'PLAN')).toEqual([
      {
        ...groups[0],
        items: [expect.objectContaining({ id: 'alpha' })],
      },
    ]);
  });

  it('counts conversations across all groups', (): void => {
    const groups = buildConversationGroups([
      makeConversation({ id: 'alpha' }),
      makeConversation({ id: 'beta' }),
    ]);

    expect(countGroupItems(groups)).toBe(2);
  });
});
