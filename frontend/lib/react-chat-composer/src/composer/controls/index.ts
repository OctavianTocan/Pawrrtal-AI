/**
 * Internal barrel for the composer's footer controls. Re-exported from the
 * package's `primitives` entry where consumers can reach the standalone
 * pieces (e.g. `VoiceMeter`) without rendering the full composer.
 */

export { AttachButton } from './AttachButton';
export { ComposerTooltip, type ComposerTooltipProps } from './ComposerTooltip';
export { PlanButton, type PlanButtonProps } from './PlanButton';
export { VoiceMeter, type VoiceMeterProps } from './VoiceMeter';
export { WaveformTimeline, type WaveformTimelineProps } from './WaveformTimeline';
export {
	buildTranscriptContent,
	fallbackTranscript,
	formatRecordingTime,
} from './transcript';
export {
	type BrowserSpeechRecognition,
	type BrowserSpeechRecognitionEvent,
	getSpeechRecognition,
	readSpeechTranscript,
} from './voice-recognition';
