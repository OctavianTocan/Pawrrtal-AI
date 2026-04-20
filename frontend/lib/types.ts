/**
 * Shared TypeScript type definitions for conversations, messages, and sidebar items.
 *
 * @fileoverview Types consumed by both the sidebar and the chat view.
 */

/** The role of a message sender: human user, AI assistant, or a plan artifact. */
export type MessageRole = 'user' | 'assistant' | 'plan';

/** Structured label attached to a conversation (e.g. status tags, categories). */
export type ConversationLabel = {
  /** Machine-readable slug derived from the label name. */
  id?: string;
  /** Human-readable label text. */
  name: string;
  /** Optional hex color for badge rendering. */
  color?: string;
  /** Optional string value associated with the label. */
  value?: string;
  /**
   * Semantic type hint for the value.
   * The value itself is always stored as a string regardless of this hint.
   */
  valueType?: 'string' | 'number' | 'date';
};

/**
 * A label that is either a structured object or a legacy plain string.
 * TODO: Remove the plain-string branch once label migration is complete.
 */
export type ConversationLabelLike = ConversationLabel | string;

/** A single conversation record as returned by the backend API. */
export interface Conversation {
  /** Unique conversation identifier. */
  id: string;
  /** ID of the user who owns the conversation. */
  user_id: string;
  /** Display title of the conversation. */
  title: string;
  /** ISO timestamp of creation. */
  created_at: string;
  /** ISO timestamp of last update. */
  updated_at: string;
  // Optional sidebar metadata ported from Craft-style session rows.
  /** Whether the conversation is currently generating a response. */
  is_processing?: boolean;
  /** Whether the sidebar should show an unread indicator. */
  has_unread_meta?: boolean;
  /** Role of the most recent message in the conversation. */
  last_message_role?: MessageRole | null;
  /** Number of queued prompts awaiting processing. */
  pending_prompt_count?: number;
  /** Tags or categories assigned to the conversation. */
  labels?: ConversationLabelLike[];
}

/**
 * Message shape used by the Agno agent / chat API.
 *
 * @property role - Sender of the message. Intentionally a subset of {@link MessageRole}
 *   (excludes `'plan'`, which is not a valid Agno API role).
 * @property content - Plain-text message body.
 */
export interface AgnoMessage {
  /** Sender of the message. Excludes `'plan'` from {@link MessageRole}. */
  role: Exclude<MessageRole, 'plan'>;
  /** Plain-text message body. */
  content: string;
}
