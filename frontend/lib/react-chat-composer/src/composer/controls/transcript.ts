/**
 * Voice transcript helpers.
 *
 * @fileoverview Pure string helpers shared by the voice-recording UI. Lives
 * in a `.ts` (not `.tsx`) so consumers that only need the formatting helpers
 * don't pay a JSX-runtime tax.
 */

/**
 * Formats an elapsed recording duration as `m:ss`.
 *
 * @param seconds - Elapsed time in whole seconds.
 * @returns A `minutes:seconds` string with seconds zero-padded.
 */
export function formatRecordingTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Appends a voice transcript to any existing draft content.
 *
 * @param options - The current draft text and the new transcript.
 * @returns A merged string with the transcript appended to the existing draft.
 */
export function buildTranscriptContent(options: {
	/** Draft text already present in the textarea. */
	currentContent: string;
	/** New transcript text returned by the voice provider. */
	transcript: string;
}): string {
	const trimmedContent = options.currentContent.trim();
	const trimmedTranscript = options.transcript.trim();
	if (!trimmedContent) return trimmedTranscript;
	if (!trimmedTranscript) return trimmedContent;
	return `${trimmedContent} ${trimmedTranscript}`;
}
