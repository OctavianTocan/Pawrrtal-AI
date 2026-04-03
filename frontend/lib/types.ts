/*
    Conversation type for the frontend.
    @param id - The ID of the conversation.
    @param user_id - The ID of the user who owns the conversation.
    @param title - The title of the conversation.
    @param created_at - The date and time the conversation was created.
    @param updated_at - The date and time the conversation was last updated.
*/
export type ConversationLabel = {
	id?: string;
	name: string;
	color?: string;
	value?: string;
	valueType?: string;
};

export interface Conversation {
	// The ID of the conversation.
	id: string;
	// The ID of the user who owns the conversation.
	user_id: string;
	// The title of the conversation.
	title: string;
	// The date and time the conversation was created.
	created_at: string;
	// The date and time the conversation was last updated.
	updated_at: string;
	// Optional sidebar metadata ported from Craft-style session rows.
	is_processing?: boolean;
	has_unread_meta?: boolean;
	last_message_role?: string | null;
	pending_prompt_count?: number;
	labels?: Array<ConversationLabel | string>;
}

/**
 * Message shape used by the Agno agent / chat API.
 * @property role - Sender of the message: user or assistant.
 * @property content - Plain-text message body.
 */
export interface AgnoMessage {
	role: "user" | "assistant";
	content: string;
}
