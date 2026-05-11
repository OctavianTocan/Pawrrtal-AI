/**
 * Browser SpeechRecognition adapter.
 *
 * @fileoverview Thin typing layer over the `window.SpeechRecognition` / WebKit
 * fallback. Consumers that prefer the browser's built-in recognizer over an
 * external STT provider can call {@link getSpeechRecognition} directly.
 */

/** Minimal browser speech-recognition surface used by the composer. */
export interface BrowserSpeechRecognition {
	/** Whether the recognizer keeps running after the first final result. */
	continuous: boolean;
	/** Whether interim, non-final results are surfaced. */
	interimResults: boolean;
	/** BCP 47 language tag used for recognition. */
	lang: string;
	/** Begin recognition. */
	start: () => void;
	/** Stop recognition, surfacing one final result. */
	stop: () => void;
	/** Cancel recognition without finalizing. */
	abort?: () => void;
	/** Fired when recognition ends for any reason. */
	onend: ((event: Event) => void) | null;
	/** Fired on an error condition. */
	onerror: ((event: Event) => void) | null;
	/** Fired when a recognition result is available. */
	onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
}

interface BrowserSpeechRecognitionAlternative {
	transcript: string;
}

interface BrowserSpeechRecognitionResult {
	readonly length: number;
	readonly isFinal: boolean;
	[index: number]: BrowserSpeechRecognitionAlternative | undefined;
}

interface BrowserSpeechRecognitionResultList {
	readonly length: number;
	[index: number]: BrowserSpeechRecognitionResult | undefined;
}

/** Browser speech-recognition result event shape used by the transcript reader. */
export interface BrowserSpeechRecognitionEvent {
	/** Ordered list of recognition results emitted so far. */
	results: BrowserSpeechRecognitionResultList;
}

type BrowserSpeechRecognitionConstructor = new () => unknown;

interface BrowserSpeechWindow extends Window {
	SpeechRecognition?: BrowserSpeechRecognitionConstructor;
	webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

/**
 * Reads the current speech-recognition transcript from a result event.
 *
 * @param event - The `SpeechRecognitionEvent` payload from `onresult`.
 * @returns The trimmed transcript string built from every result entry.
 */
export function readSpeechTranscript(event: BrowserSpeechRecognitionEvent): string {
	let nextTranscript = '';
	for (let index = 0; index < event.results.length; index++) {
		nextTranscript += event.results[index]?.[0]?.transcript ?? '';
	}
	return nextTranscript.trim();
}

/**
 * Returns a configured speech-recognition instance when the browser supports it.
 *
 * @returns A configured `SpeechRecognition` instance, or `null` if neither the
 *   standard nor the `webkit*` constructor is available.
 */
export function getSpeechRecognition(): BrowserSpeechRecognition | null {
	if (typeof window === 'undefined') return null;
	const speechWindow = window as unknown as BrowserSpeechWindow;
	const SpeechRecognitionConstructor =
		speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
	if (!SpeechRecognitionConstructor) return null;
	const recognition = new SpeechRecognitionConstructor() as BrowserSpeechRecognition;
	recognition.continuous = true;
	recognition.interimResults = true;
	recognition.lang = 'en-US';
	return recognition;
}
