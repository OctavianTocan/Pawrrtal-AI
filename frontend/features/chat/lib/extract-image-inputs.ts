/**
 * Convert composer-attached `File` objects into the wire shape the chat
 * API expects.
 *
 * The active composer (`@octavian-tocan/react-chat-composer`'s
 * `ChatComposer`) delivers each attachment as a raw `File` from the
 * platform file picker / drag-drop. The backend's `ChatImageInput`
 * schema wants base64-encoded image bytes plus an explicit MIME type, so
 * this helper:
 *
 *   1. Filters down to image MIME types the provider bridge supports.
 *   2. Reads each file as a base64 data URL via `FileReader` and slices
 *      off the `data:<mime>;base64,` prefix.
 *   3. Caps the result at {@link MAX_COMPOSER_IMAGES} to mirror the
 *      backend's `MAX_IMAGES_PER_REQUEST` so a malicious or confused
 *      client can't blow the prompt budget.
 *
 * Files that don't match an allowed MIME type or that fail to read are
 * silently dropped — the user keeps any non-image attachment in the
 * composer for context, but only the supported image MIME types reach
 * the agent.
 */

import type { ChatImageInput } from '../hooks/use-chat';

/**
 * Per-request image cap, mirrored from the backend's
 * `MAX_IMAGES_PER_REQUEST`. Bounded so a malicious / confused client
 * can't blow the prompt budget; generous enough for pasting a short
 * slideshow.
 */
export const MAX_COMPOSER_IMAGES = 8;

const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Match the `data:<mime>;base64,<bytes>` prefix on a `FileReader` data URL. */
const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
	return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

function readFileAsDataUrl(file: File): Promise<string | null> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		// Both branches resolve so a single failed file can never reject the
		// surrounding `Promise.all` — the caller drops nulls and keeps the
		// rest of the slideshow intact.
		reader.onloadend = () => {
			resolve(typeof reader.result === 'string' ? reader.result : null);
		};
		reader.onerror = () => resolve(null);
		reader.readAsDataURL(file);
	});
}

async function fileToImageInput(file: File): Promise<ChatImageInput | null> {
	if (!file.type.startsWith('image/')) return null;
	const dataUrl = await readFileAsDataUrl(file);
	if (!dataUrl) return null;

	const match = DATA_URL_PATTERN.exec(dataUrl);
	if (!match) return null;

	const [, mime, base64Payload] = match;
	// Trust the data URL's declared MIME (FileReader echoes the file's MIME);
	// fall back to `file.type` only if the URL omits it for any reason.
	const resolvedMime = mime ?? file.type;
	if (!isAllowedImageMimeType(resolvedMime)) return null;
	if (!base64Payload) return null;

	return { data: base64Payload, media_type: resolvedMime };
}

/**
 * Convert composer attachments into validated, capped {@link ChatImageInput}s.
 *
 * @param files - The `attachments` array carried by `ChatComposerMessage`.
 * @returns Up to {@link MAX_COMPOSER_IMAGES} validated image inputs in
 *   submission order. Returns an empty array when no attachments qualify
 *   so the caller can omit the `images` field from the wire payload.
 */
export async function extractImageInputs(files: readonly File[]): Promise<ChatImageInput[]> {
	// Cap the input list before reading to bound the FileReader work; an
	// over-cap drag-drop shouldn't pay the I/O cost of decoding files that
	// would be discarded anyway.
	const cappedFiles = files.slice(0, MAX_COMPOSER_IMAGES);
	const candidates = await Promise.all(cappedFiles.map(fileToImageInput));
	return candidates.filter((input): input is ChatImageInput => input !== null);
}
