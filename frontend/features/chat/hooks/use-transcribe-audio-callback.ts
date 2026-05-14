'use client';

import { useCallback } from 'react';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { API_ENDPOINTS } from '@/lib/api';
import { toast } from '@/lib/toast';

/** Picks the multipart filename extension based on the recorder's MIME type. */
function pickAudioExtension(mimeType: string): string {
	return mimeType.includes('mp4') ? 'mp4' : 'webm';
}

/**
 * Builds the multipart/form-data body sent to the STT proxy.
 *
 * The xAI endpoint requires `file` to be the LAST field — `FormData.append`
 * preserves insertion order, so the body construction is sequential here.
 *
 * @param audio - Captured audio blob from the package's MediaRecorder.
 * @param mimeType - The MIME type the recorder produced. Determines the
 *   filename extension the proxy receives.
 * @returns A FormData payload ready to POST.
 */
function buildSttFormData(audio: Blob, mimeType: string): FormData {
	const formData = new FormData();
	formData.append('language', 'en');
	formData.append('format', 'true');
	formData.append('file', audio, `voice-note.${pickAudioExtension(mimeType)}`);
	return formData;
}

/**
 * Returns a stable callback that uploads a recorded audio blob to the
 * pawrrtal STT proxy and resolves with the transcript text.
 *
 * Wired into `@octavian-tocan/react-chat-composer`'s `onTranscribeAudio`
 * prop. The package owns the recorder lifecycle now; pawrrtal only owns
 * the upload + transport. On failure the callback surfaces a toast and
 * rethrows so the composer can fall back to its idle state.
 *
 * @returns A callback `(blob, mimeType) => Promise<string>` suitable to
 *   pass directly to the package's `onTranscribeAudio` prop.
 */
export function useTranscribeAudioCallback(): (audio: Blob, mimeType: string) => Promise<string> {
	const fetcher = useAuthedFetch();

	return useCallback(
		async (audio: Blob, mimeType: string): Promise<string> => {
			try {
				const response = await fetcher(API_ENDPOINTS.stt.transcribe, {
					method: 'POST',
					body: buildSttFormData(audio, mimeType),
				});
				const payload = (await response.json()) as { text?: string };
				return (payload.text ?? '').trim();
			} catch (capturedError) {
				toast.error('Transcription failed. Try again in a moment.');
				throw capturedError;
			}
		},
		[fetcher]
	);
}
