'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Lifecycle states the recorder cycles through. */
export type VoiceRecordingStatus =
	| 'idle'
	| 'requesting-permission'
	| 'recording'
	| 'transcribing'
	| 'error';

/** Options for {@link useVoiceRecording}. */
export interface UseVoiceRecordingOptions {
	/**
	 * Called when the user finishes a recording. Receives the audio blob and
	 * its MIME type; resolves with the transcript text. Throwing or rejecting
	 * transitions the hook to the `error` state.
	 *
	 * If undefined, the hook stays in `idle` and `startRecording` is a no-op —
	 * which lets the composer hide its mic button entirely when the consumer
	 * has not wired up an STT provider.
	 */
	onTranscribeAudio?: (audio: Blob, mimeType: string) => Promise<string>;
	/** Optional error reporter; defaults to a silent console call. */
	onError?: (error: Error) => void;
}

/** Result returned by {@link useVoiceRecording}. */
export interface UseVoiceRecordingResult {
	/** Current lifecycle phase — drives the composer's mic / stop UI. */
	status: VoiceRecordingStatus;
	/** Last error message when `status === 'error'`. */
	error: string | null;
	/** True when an `onTranscribeAudio` handler is wired up (mic button visible). */
	isSupported: boolean;
	/** Begin capturing microphone audio. Resolves once recording is live. */
	startRecording: () => Promise<void>;
	/**
	 * Stop the recorder and pass the captured blob to `onTranscribeAudio`.
	 *
	 * Resolves with the transcript text on success, or `null` if recording was
	 * cancelled / produced no audio. Errors surface via the `error` state +
	 * the `onError` callback rather than throwing — the consumer's submit path
	 * does not need to wrap this in try/catch.
	 */
	stopRecording: () => Promise<string | null>;
	/** Discard the current recording without uploading anything. */
	cancelRecording: () => void;
}

/** MIME type the browser MediaRecorder will produce, in priority order. */
const PREFERRED_MIME_TYPES = [
	'audio/webm;codecs=opus',
	'audio/webm',
	'audio/ogg;codecs=opus',
	'audio/mp4',
] as const;

/**
 * Picks a MIME type the browser can record. Falls back to the empty string
 * (browser default) when nothing in the priority list is supported.
 */
function pickRecorderMimeType(): string {
	if (typeof MediaRecorder === 'undefined') return '';
	for (const candidate of PREFERRED_MIME_TYPES) {
		if (MediaRecorder.isTypeSupported(candidate)) return candidate;
	}
	return '';
}

/** Awaits the recorder's `stop` event with the joined audio blob. */
function awaitFinalBlob(
	recorder: MediaRecorder,
	resolverRef: { current: ((blob: Blob | null) => void) | null },
): Promise<Blob | null> {
	return new Promise<Blob | null>((resolve) => {
		resolverRef.current = resolve;
		if (recorder.state === 'inactive') {
			resolve(null);
			return;
		}
		recorder.stop();
	});
}

/**
 * Records microphone audio and delegates transcription to the consumer.
 *
 * The flow:
 *   1. `startRecording()` — request mic permission, start `MediaRecorder`.
 *   2. `stopRecording()` — stop the recorder, hand the blob to
 *      `onTranscribeAudio`, return the resolved transcript.
 *   3. `cancelRecording()` — abort without uploading.
 *
 * The transcription provider is swapped in via the `onTranscribeAudio`
 * callback (Whisper, Deepgram, xAI, browser SpeechRecognition, mocked-for-
 * tests). When the callback is undefined, `isSupported` is `false` so the
 * composer can hide its mic affordance instead of presenting a broken button.
 *
 * @param options - The transcription callback + optional error reporter.
 * @returns The recording state machine + the three lifecycle handlers.
 */
export function useVoiceRecording(options: UseVoiceRecordingOptions = {}): UseVoiceRecordingResult {
	const { onTranscribeAudio, onError } = options;
	const onTranscribeRef = useRef(onTranscribeAudio);
	onTranscribeRef.current = onTranscribeAudio;
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	const [status, setStatus] = useState<VoiceRecordingStatus>('idle');
	const [error, setError] = useState<string | null>(null);

	const recorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const mimeTypeRef = useRef<string>('');
	// Latch for stopRecording's `dataavailable` → `stop` race: when the
	// recorder stops, we wait on this promise to resolve with the final
	// blob before invoking the transcribe callback.
	const finalBlobResolverRef = useRef<((blob: Blob | null) => void) | null>(null);

	const releaseStream = useCallback((): void => {
		const stream = streamRef.current;
		if (stream) {
			for (const track of stream.getTracks()) {
				track.stop();
			}
		}
		streamRef.current = null;
		recorderRef.current = null;
		chunksRef.current = [];
		finalBlobResolverRef.current = null;
	}, []);

	useEffect(() => {
		return () => {
			releaseStream();
		};
	}, [releaseStream]);

	const reportError = useCallback((message: string, captured?: unknown): void => {
		setStatus('error');
		setError(message);
		const reporter = onErrorRef.current;
		if (reporter) {
			reporter(captured instanceof Error ? captured : new Error(message));
		}
	}, []);

	const startRecording = useCallback(async (): Promise<void> => {
		if (!onTranscribeRef.current) return;
		if (status === 'recording' || status === 'requesting-permission') return;
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			reportError('Microphone capture is not supported in this browser.');
			return;
		}

		setStatus('requesting-permission');
		setError(null);

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mimeType = pickRecorderMimeType();
			const recorder = mimeType
				? new MediaRecorder(stream, { mimeType })
				: new MediaRecorder(stream);

			chunksRef.current = [];
			mimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm';
			streamRef.current = stream;
			recorderRef.current = recorder;

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				const blob =
					chunksRef.current.length > 0
						? new Blob(chunksRef.current, { type: mimeTypeRef.current })
						: null;
				finalBlobResolverRef.current?.(blob);
				finalBlobResolverRef.current = null;
			};

			// 250 ms chunking keeps latency low on the final flush — the
			// `stop` event fires before all in-flight `dataavailable` events
			// drain otherwise.
			recorder.start(250);
			setStatus('recording');
		} catch (capturedError) {
			releaseStream();
			const message =
				capturedError instanceof Error ? capturedError.message : 'Could not start recording.';
			reportError(message, capturedError);
		}
	}, [releaseStream, reportError, status]);

	const stopRecording = useCallback(async (): Promise<string | null> => {
		const recorder = recorderRef.current;
		const transcribe = onTranscribeRef.current;
		if (!recorder || !transcribe) return null;

		setStatus('transcribing');
		const finalBlob = await awaitFinalBlob(recorder, finalBlobResolverRef);
		const finalMime = mimeTypeRef.current;
		releaseStream();

		if (!finalBlob || finalBlob.size === 0) {
			setStatus('idle');
			return null;
		}

		try {
			const transcript = (await transcribe(finalBlob, finalMime)).trim();
			setStatus('idle');
			return transcript || null;
		} catch (capturedError) {
			const message =
				capturedError instanceof Error ? capturedError.message : 'Transcription failed.';
			reportError(message, capturedError);
			return null;
		}
	}, [releaseStream, reportError]);

	const cancelRecording = useCallback((): void => {
		const recorder = recorderRef.current;
		if (recorder && recorder.state !== 'inactive') {
			finalBlobResolverRef.current = () => {
				/* swallow */
			};
			recorder.stop();
		}
		releaseStream();
		setStatus('idle');
		setError(null);
	}, [releaseStream]);

	return {
		status,
		error,
		isSupported: typeof onTranscribeAudio === 'function',
		startRecording,
		stopRecording,
		cancelRecording,
	};
}
