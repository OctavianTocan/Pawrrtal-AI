/**
 * Internal barrel for the composer's footer controls. Re-exported from the
 * package's `primitives` entry where consumers can reach the standalone
 * pieces (e.g. `VoiceMeter`) without rendering the full composer.
 */

export { AttachButton } from './AttachButton.js';
export { ComposerTooltip, type ComposerTooltipProps } from './ComposerTooltip.js';
export { PlanButton, type PlanButtonProps } from './PlanButton.js';
export { VoiceMeter, type VoiceMeterProps } from './VoiceMeter.js';
export { WaveformTimeline, type WaveformTimelineProps } from './WaveformTimeline.js';
export {
	buildTranscriptContent,
	fallbackTranscript,
	formatRecordingTime,
} from './transcript.js';
export {
	type BrowserSpeechRecognition,
	type BrowserSpeechRecognitionEvent,
	getSpeechRecognition,
	readSpeechTranscript,
} from './voice-recognition.js';
