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
} from './PromptInputForm';
export { PromptInputTextarea, type PromptInputTextareaProps } from './PromptInputTextarea';
export {
	PromptInputAttachment,
	type PromptInputAttachmentProps,
	PromptInputAttachments,
	type PromptInputAttachmentsProps,
} from './PromptInputAttachments';
export {
	PromptInputFooter,
	type PromptInputFooterProps,
	PromptInputSubmit,
	type PromptInputSubmitProps,
	type PromptInputSubmitStatus,
} from './PromptInputLayout';
export {
	type AttachmentFilePart,
	type AttachmentsContext,
	usePromptInputAttachments,
} from './promptInputContext';
