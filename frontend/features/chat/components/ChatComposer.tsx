'use client';

import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ListChecksIcon,
  MicIcon,
  PlusIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SquareIcon,
} from 'lucide-react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  type ChatModelId,
  type ChatReasoningLevel,
  ModelSelectorPopover,
} from './ModelSelectorPopover';

/** Props for the Codex-like chat composer island. */
export type ChatComposerProps = {
  /** The current message being composed by the user. */
  message: PromptInputMessage;
  /** Whether an assistant response is currently streaming. */
  isLoading?: boolean;
  /** Selected chat model ID. */
  selectedModelId: ChatModelId;
  /** Selected reasoning level. */
  selectedReasoning: ChatReasoningLevel;
  /** Additional classes for the root composer form. */
  className?: string;
  /** Callback fired when the textarea content changes. */
  onUpdateMessage: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Callback fired when the user submits the message. */
  onSendMessage: (message: PromptInputMessage) => void;
  /** Callback fired when voice transcription should replace the draft content. */
  onReplaceMessageContent: (content: string) => void;
  /** Callback fired when the selected model changes. */
  onSelectModel: (modelId: ChatModelId) => void;
  /** Callback fired when the selected reasoning level changes. */
  onSelectReasoning: (reasoning: ChatReasoningLevel) => void;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
};

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative | undefined;
};

type BrowserSpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionResult | undefined;
};

type BrowserSpeechRecognitionEvent = {
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognitionConstructor = new () => unknown;

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

function AttachButton(): React.JSX.Element {
  const attachments = usePromptInputAttachments();

  return (
    <ComposerTooltip content="Attach files">
      <Button
        aria-label="Attach files"
        className="size-7 rounded-[7px] text-muted-foreground hover:text-foreground"
        onClick={attachments.openFileDialog}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </Button>
    </ComposerTooltip>
  );
}

function ComposerTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{content}</TooltipContent>
    </Tooltip>
  );
}

function AutoReviewSelector(): React.JSX.Element {
  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-7 gap-1.5 rounded-[7px] bg-transparent px-2 text-[12px] font-normal text-accent hover:bg-foreground/[0.04] hover:text-accent aria-expanded:bg-foreground/[0.04] data-[state=open]:bg-foreground/[0.04]"
              type="button"
              variant="ghost"
            >
              <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
              Auto-review
              <ChevronDownIcon aria-hidden="true" className="size-3" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent align="start" className="min-w-52" side="top" sideOffset={8}>
          <DropdownMenuItem>
            <span className="flex size-4 items-center justify-center">
              <SlidersHorizontalIcon aria-hidden="true" className="size-3.5" />
            </span>
            Default permissions
          </DropdownMenuItem>
          <DropdownMenuItem className="justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
              Auto-review
            </span>
            <CheckIcon aria-hidden="true" className="size-3.5 text-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span className="flex size-4 items-center justify-center">
              <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
            </span>
            Full access
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <span className="flex size-4 items-center justify-center">
              <SlidersHorizontalIcon aria-hidden="true" className="size-3.5" />
            </span>
            Custom (config.toml)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent side="top">
        <span className="block">Review code changes automatically</span>
        <span className="block text-muted-foreground">Shift + Tab to toggle</span>
      </TooltipContent>
    </Tooltip>
  );
}

const VOICE_METER_BARS = [8, 14, 10, 18, 12, 24, 16, 30, 18, 26, 14, 22, 10, 18, 12, 20];
const EMPTY_COMPOSER_PLACEHOLDERS = [
  'Ask AI Nexus anything. @ to mention context',
  'Press Cmd+B to toggle the sidebar',
  'Type @ to mention files, folders, or skills',
  'Attach files with +',
  'Use Auto-review to let AI Nexus inspect changes',
] as const;
const DEFAULT_EMPTY_COMPOSER_PLACEHOLDER = 'Ask AI Nexus anything. @ to mention context';
const PLACEHOLDER_ROTATION_INTERVAL_MS = 3200;

function formatRecordingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function buildTranscriptContent({
  currentContent,
  transcript,
}: {
  currentContent: string;
  transcript: string;
}): string {
  const trimmedContent = currentContent.trim();
  const trimmedTranscript = transcript.trim();

  if (!trimmedContent) {
    return trimmedTranscript;
  }

  if (!trimmedTranscript) {
    return trimmedContent;
  }

  return `${trimmedContent} ${trimmedTranscript}`;
}

function fallbackTranscript(seconds: number): string {
  return `Voice note recorded for ${formatRecordingTime(seconds)}.`;
}

function readSpeechTranscript(event: BrowserSpeechRecognitionEvent): string {
  let nextTranscript = '';

  for (let index = 0; index < event.results.length; index++) {
    nextTranscript += event.results[index]?.[0]?.transcript ?? '';
  }

  return nextTranscript.trim();
}

function getSpeechRecognition(): BrowserSpeechRecognition | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const speechWindow = window as unknown as BrowserSpeechWindow;
  const SpeechRecognitionConstructor =
    speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

  if (!SpeechRecognitionConstructor) {
    return null;
  }

  const recognition = new SpeechRecognitionConstructor() as BrowserSpeechRecognition;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  return recognition;
}

function useRotatingPlaceholder(hasContent: boolean): string {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (hasContent) {
      setPlaceholderIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % EMPTY_COMPOSER_PLACEHOLDERS.length);
    }, PLACEHOLDER_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [hasContent]);

  if (hasContent) {
    return DEFAULT_EMPTY_COMPOSER_PLACEHOLDER;
  }

  return EMPTY_COMPOSER_PLACEHOLDERS[placeholderIndex] ?? DEFAULT_EMPTY_COMPOSER_PLACEHOLDER;
}

function AnimatedComposerPlaceholder({
  isVisible,
  text,
}: {
  isVisible: boolean;
  text: string;
}): React.JSX.Element | null {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute top-3 left-3 z-10 pr-6 text-[14px] leading-6 text-muted-foreground/70"
      aria-hidden="true"
    >
      <span className="composer-placeholder-enter block" key={text}>
        {text}
      </span>
    </div>
  );
}

function VoiceMeter({
  elapsedSeconds,
  onSend,
  onStop,
}: {
  elapsedSeconds: number;
  onSend: () => void;
  onStop: () => void;
}): React.JSX.Element {
  return (
    <div className="ml-2 flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center">
        <div className="h-px min-w-8 flex-1 border-muted-foreground/30 border-t border-dashed" />
        <div className="flex h-7 shrink-0 items-center gap-[2px] px-2">
          {VOICE_METER_BARS.map((height, index) => (
            <span
              aria-hidden="true"
              className="w-[2px] rounded-full bg-foreground/75"
              key={`${height}-${index}`}
              style={{
                height,
                opacity: index % 3 === 0 ? 0.55 : 0.9,
                animation: `pulse 1.1s ease-in-out ${index * 70}ms infinite`,
              }}
            />
          ))}
        </div>
      </div>
      <span className="w-9 text-right text-[12px] text-muted-foreground tabular-nums">
        {formatRecordingTime(elapsedSeconds)}
      </span>
      <ComposerTooltip content="Stop and transcribe">
        <Button
          aria-label="Stop and transcribe"
          className="size-8 rounded-full bg-foreground-10 text-foreground hover:bg-foreground-15"
          onClick={onStop}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <SquareIcon aria-hidden="true" className="size-3 fill-current" />
        </Button>
      </ComposerTooltip>
      <ComposerTooltip content="Transcribe and send">
        <Button
          aria-label="Transcribe and send"
          className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/85"
          onClick={onSend}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ArrowUpIcon aria-hidden="true" className="size-4" />
        </Button>
      </ComposerTooltip>
    </div>
  );
}

/**
 * Renders the main chat input island with inline controls and a model selector.
 */
export function ChatComposer({
  message,
  isLoading,
  selectedModelId,
  selectedReasoning,
  className,
  onUpdateMessage,
  onSendMessage,
  onReplaceMessageContent,
  onSelectModel,
  onSelectReasoning,
}: ChatComposerProps): React.JSX.Element {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const hasContent = message.content.trim().length > 0;
  const placeholder = useRotatingPlaceholder(hasContent);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
    },
    []
  );

  const startRecording = (): void => {
    const recognition = getSpeechRecognition();
    recognitionRef.current = recognition;
    setVoiceTranscript('');
    setRecordingSeconds(0);
    setIsRecording(true);

    if (!recognition) {
      return;
    }

    recognition.onresult = (event) => {
      setVoiceTranscript(readSpeechTranscript(event));
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      recognitionRef.current = null;
    };
    recognition.start();
  };

  const finishRecording = ({ shouldSend }: { shouldSend: boolean }): void => {
    const transcript = voiceTranscript.trim() || fallbackTranscript(recordingSeconds);
    const nextContent = buildTranscriptContent({
      currentContent: message.content,
      transcript,
    });

    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    setVoiceTranscript('');

    if (shouldSend) {
      onSendMessage({ ...message, content: nextContent });
      return;
    }

    onReplaceMessageContent(nextContent);
  };

  const handleStopRecording = (): void => {
    finishRecording({ shouldSend: false });
  };

  const handleSendRecording = (): void => {
    finishRecording({ shouldSend: true });
  };

  return (
    <PromptInput
      className={cn('w-full max-w-[48.75rem]', className)}
      inputGroupClassName="chat-composer-input-group rounded-[14px] border-transparent bg-foreground-5 shadow-minimal"
      multiple={true}
      onSubmit={onSendMessage}
    >
      <PromptInputAttachments className="px-3 pt-2 pb-0">
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
      <div className="relative w-full self-stretch">
        <AnimatedComposerPlaceholder isVisible={!hasContent} text={placeholder} />
        <PromptInputTextarea
          aria-label={placeholder}
          className="max-h-48 min-h-[4.5rem] w-full overflow-y-auto px-3 pt-3 pb-1 text-[14px] leading-6 outline-none placeholder:text-transparent focus-visible:outline-none"
          onChange={onUpdateMessage}
          placeholder=""
          value={message.content}
        />
      </div>
      <PromptInputFooter className="min-h-10 px-2 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <AttachButton />
          {isRecording ? (
            <VoiceMeter
              elapsedSeconds={recordingSeconds}
              onSend={handleSendRecording}
              onStop={handleStopRecording}
            />
          ) : (
            <>
              <ComposerTooltip content="Create a plan">
                <Button
                  className="h-7 gap-1.5 rounded-[7px] px-2 text-[12px] font-normal text-muted-foreground hover:text-foreground"
                  type="button"
                  variant="ghost"
                >
                  <ListChecksIcon aria-hidden="true" className="size-3.5" />
                  Plan
                </Button>
              </ComposerTooltip>
              <AutoReviewSelector />
            </>
          )}
        </div>

        <div className={cn('ml-auto flex shrink-0 items-center gap-1', isRecording && 'hidden')}>
          <ModelSelectorPopover
            selectedModelId={selectedModelId}
            selectedReasoning={selectedReasoning}
            onSelectModel={onSelectModel}
            onSelectReasoning={onSelectReasoning}
          />
          <ComposerTooltip content="Click to dictate or hold ^M">
            <Button
              aria-label="Start voice input"
              aria-pressed={isRecording}
              className="size-8 rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
              onClick={startRecording}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MicIcon aria-hidden="true" className="size-4" />
            </Button>
          </ComposerTooltip>
          <ComposerTooltip content="Send message">
            <PromptInputSubmit
              className="size-8 cursor-pointer rounded-full bg-foreground text-background hover:bg-foreground/85 disabled:bg-foreground/20 disabled:text-background/60"
              disabled={!hasContent || isLoading}
              status={isLoading ? 'streaming' : 'ready'}
            >
              {isLoading ? (
                <SquareIcon aria-hidden="true" className="size-3 fill-current" />
              ) : (
                <ArrowUpIcon aria-hidden="true" className="size-4" />
              )}
            </PromptInputSubmit>
          </ComposerTooltip>
        </div>
      </PromptInputFooter>
    </PromptInput>
  );
}
