/*
    Conversation type for the frontend.
    @param id - The ID of the conversation.
    @param user_id - The ID of the user who owns the conversation.
    @param title - The title of the conversation.
    @param created_at - The date and time the conversation was created.
    @param updated_at - The date and time the conversation was last updated.
*/
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

/**
 * Shape of a message submitted from the prompt input.
 * Extracted here so it can be shared across features without
 * importing from the ai-elements component tree.
 */
export interface PromptInputMessage {
	content: string;
	files: import("ai").FileUIPart[];
}
