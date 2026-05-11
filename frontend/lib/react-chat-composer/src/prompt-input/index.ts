/**
 * Internal barrel for the prompt-input primitives. Not part of the package's
 * public API surface — consumers should reach for `ChatComposer` instead.
 */

export {
	PromptInputForm,
	type PromptInputFormProps,
	type PromptInputFormError,
	type PromptInputFormErrorCode,
	type PromptInputMessage,
} from './PromptInputForm.js';
export { PromptInputTextarea, type PromptInputTextareaProps } from './PromptInputTextarea.js';
export {
	PromptInputAttachment,
	type PromptInputAttachmentProps,
	PromptInputAttachments,
	type PromptInputAttachmentsProps,
} from './PromptInputAttachments.js';
export {
	PromptInputFooter,
	type PromptInputFooterProps,
	PromptInputSubmit,
	type PromptInputSubmitProps,
	type PromptInputSubmitStatus,
} from './PromptInputLayout.js';
export {
	type AttachmentFilePart,
	type AttachmentsContext,
	usePromptInputAttachments,
} from './promptInputContext.js';
