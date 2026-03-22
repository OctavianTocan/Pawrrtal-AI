/**
 * Code viewer components for syntax highlighting and diff display.
 */

export {
	DiffBackgroundIcon,
	DiffSplitIcon,
	DiffUnifiedIcon,
} from "./DiffIcons";
export {
	DiffViewerControls,
	type DiffViewerControlsProps,
} from "./DiffViewerControls";
export {
	formatFilePath,
	getLanguageFromPath,
	LANGUAGE_MAP,
	truncateFilePath,
} from "./language-map";
export { ShikiCodeViewer, type ShikiCodeViewerProps } from "./ShikiCodeViewer";
export {
	getDiffStats,
	ShikiDiffViewer,
	type ShikiDiffViewerProps,
} from "./ShikiDiffViewer";
export {
	getUnifiedDiffStats,
	UnifiedDiffViewer,
	type UnifiedDiffViewerProps,
} from "./UnifiedDiffViewer";
