/**
 * Prompt input speech button.
 *
 * @fileoverview Web Speech API integration for prompt input dictation.
 */

import { MicIcon } from 'lucide-react';
import {
	type ComponentProps,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { cn } from '@/lib/utils';
import { PromptInputButton } from './prompt-input-layout';

interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start(): void;
	stop(): void;
	onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
	onend: ((this: SpeechRecognition, ev: Event) => void) | null;
	onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
	onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
	resultIndex: number;
}

type SpeechRecognitionResultList = {
	readonly length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
	readonly length: number;
	item(index: number): SpeechRecognitionAlternative;
	[index: number]: SpeechRecognitionAlternative;
	isFinal: boolean;
};

type SpeechRecognitionAlternative = {
	transcript: string;
	confidence: number;
};

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

declare global {
	interface Window {
		SpeechRecognition: {
			new (): SpeechRecognition;
		};
		webkitSpeechRecognition: {
			new (): SpeechRecognition;
		};
	}
}

/** Props for the speech-recognition prompt input button. */
export type PromptInputSpeechButtonProps = ComponentProps<typeof PromptInputButton> & {
	textareaRef?: RefObject<HTMLTextAreaElement | null>;
	onTranscriptionChange?: (text: string) => void;
};

/** Button that toggles browser speech recognition for a textarea. */
export const PromptInputSpeechButton = ({
	className,
	textareaRef,
	onTranscriptionChange,
	...props
}: PromptInputSpeechButtonProps) => {
	const [isListening, setIsListening] = useState(false);
	const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
	const recognitionRef = useRef<SpeechRecognition | null>(null);

	useEffect(() => {
		if (
			typeof window !== 'undefined' &&
			('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
		) {
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			const speechRecognition = new SpeechRecognition();

			speechRecognition.continuous = true;
			speechRecognition.interimResults = true;
			speechRecognition.lang = 'en-US';

			speechRecognition.onstart = () => {
				setIsListening(true);
			};

			speechRecognition.onend = () => {
				setIsListening(false);
			};

			speechRecognition.onresult = (event) => {
				let finalTranscript = '';

				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					if (result?.isFinal) {
						finalTranscript += result[0]?.transcript ?? '';
					}
				}

				if (finalTranscript && textareaRef?.current) {
					const textarea = textareaRef.current;
					const currentValue = textarea.value;
					const newValue = currentValue + (currentValue ? ' ' : '') + finalTranscript;

					textarea.value = newValue;
					textarea.dispatchEvent(new Event('input', { bubbles: true }));
					onTranscriptionChange?.(newValue);
				}
			};

			speechRecognition.onerror = (_event) => {
				setIsListening(false);
			};

			recognitionRef.current = speechRecognition;
			setRecognition(speechRecognition);
		}

		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.stop();
			}
		};
	}, [textareaRef, onTranscriptionChange]);

	const toggleListening = useCallback(() => {
		if (!recognition) {
			return;
		}

		if (isListening) {
			recognition.stop();
		} else {
			recognition.start();
		}
	}, [recognition, isListening]);

	return (
		<PromptInputButton
			className={cn(
				'relative transition-colors duration-150 ease-out',
				isListening && 'animate-pulse bg-accent text-accent-foreground',
				className
			)}
			disabled={!recognition}
			onClick={toggleListening}
			{...props}
		>
			<MicIcon className="size-4" />
		</PromptInputButton>
	);
};
