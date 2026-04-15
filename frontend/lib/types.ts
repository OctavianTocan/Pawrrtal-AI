/**
 * Conversation type for the frontend.
 *
 * @property id - Unique conversation identifier.
 * @property user_id - ID of the user who owns the conversation.
 * @property title - Display title of the conversation.
 * @property created_at - ISO timestamp of creation.
 * @property updated_at - ISO timestamp of last update.
 * @property is_processing - Whether the conversation is currently generating a response.
 * @property has_unread_meta - Whether the sidebar should show an unread indicator.
 * @property last_message_role - Role of the most recent message in the conversation.
 * @property pending_prompt_count - Number of queued prompts awaiting processing.
 * @property labels - Tags or categories assigned to the conversation.
 */

/** The role of a message sender: human user, AI assistant, or a plan artifact. */
export type MessageRole = 'user' | 'assistant' | 'plan';

/**
 * Structured label attached to a conversation (e.g. status tags, categories).
 *
 * @property id - Machine-readable slug derived from the label name.
 * @property name - Human-readable label text.
 * @property color - Optional hex color for badge rendering.
 * @property value - Optional freeform value associated with the label.
 * @property valueType - Optional type hint for the value (e.g. "string", "number").
 */
export type ConversationLabel = {
  id?: string;
  name: string;
  color?: string;
  value?: string;
  valueType?: string;
};

/** A label that is either a structured object or a legacy plain string. */
export type ConversationLabelLike = ConversationLabel | string;

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  // Optional sidebar metadata ported from Craft-style session rows.
  is_processing?: boolean;
  has_unread_meta?: boolean;
  last_message_role?: MessageRole | null;
  pending_prompt_count?: number;
  labels?: ConversationLabelLike[];
}

/**
 * Message shape used by the Agno agent / chat API.
 * @property role - Sender of the message: user or assistant.
 * @property content - Plain-text message body.
 */
export interface AgnoMessage {
  role: 'user' | 'assistant';
  content: string;
}
