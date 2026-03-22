/**
 * @craft-agent/ui - Shared React UI components for Craft Agent
 *
 * This package provides platform-agnostic UI components that work in both:
 * - Electron desktop app (full interactive mode)
 * - Web session viewer (read-only mode)
 *
 * Key components:
 * - SessionViewer: Read-only session transcript viewer (used by web viewer)
 * - TurnCard: Email-like display for assistant turns
 * - Markdown: Customizable markdown renderer with syntax highlighting
 *
 * Platform abstraction:
 * - PlatformProvider/usePlatform: Inject platform-specific actions
 */

// Chat components
export {
	type ActivityItem,
	type ActivityStatus,
	ActivityStatusIcon,
	asRecord,
	extractAnnotationSelectedText,
	FileTypeIcon,
	type FileTypeIconProps,
	getAnnotationFollowUpState,
	getAnnotationNoteText,
	getFileTypeLabel,
	type InlineActivityItem,
	// Inline execution for EditPopover
	InlineExecution,
	type InlineExecutionProps,
	type InlineExecutionStatus,
	isAnnotationFollowUpSent,
	mapToolEventToActivity,
	normalizeFollowUpText,
	ResponseCard,
	type ResponseCardProps,
	type ResponseContent,
	SessionViewer,
	type SessionViewerMode,
	type SessionViewerProps,
	SIZE_CONFIG,
	SystemMessage,
	type SystemMessageProps,
	type SystemMessageType,
	type TodoItem,
	TurnCard,
	TurnCardActionsMenu,
	type TurnCardActionsMenuProps,
	type TurnCardProps,
	UserMessageBubble,
	type UserMessageBubbleProps,
} from "./components/chat";
// Turn utilities (pure functions)
export * from "./components/chat/turn-utils";
// Code viewer components
export {
	DiffBackgroundIcon,
	DiffSplitIcon,
	DiffUnifiedIcon,
	DiffViewerControls,
	type DiffViewerControlsProps,
	formatFilePath,
	getDiffStats,
	getLanguageFromPath,
	getUnifiedDiffStats,
	LANGUAGE_MAP,
	ShikiCodeViewer,
	type ShikiCodeViewerProps,
	ShikiDiffViewer,
	type ShikiDiffViewerProps,
	truncateFilePath,
	UnifiedDiffViewer,
	type UnifiedDiffViewerProps,
} from "./components/code-viewer";
// Icons
export {
	Icon_Folder,
	Icon_Home,
	Icon_Inbox,
	type IconProps,
} from "./components/icons";
// Markdown
export {
	CodeBlock,
	CollapsibleMarkdownProvider,
	ImageCardStack,
	type ImageCardStackItem,
	type ImageCardStackProps,
	InlineCode,
	Markdown,
	MarkdownDatatableBlock,
	type MarkdownDatatableBlockProps,
	type MarkdownEngine,
	MarkdownImageBlock,
	type MarkdownImageBlockProps,
	type MarkdownProps,
	MarkdownSpreadsheetBlock,
	type MarkdownSpreadsheetBlockProps,
	MemoizedMarkdown,
	type RenderMode,
	TiptapMarkdownEditor,
	type TiptapMarkdownEditorProps,
	useCollapsibleMarkdown,
} from "./components/markdown";
// Overlay components
export {
	ActivityCardsOverlay,
	type ActivityCardsOverlayProps,
	type BadgeVariant,
	// Specialized overlays
	CodePreviewOverlay,
	type CodePreviewOverlayProps,
	ContentFrame,
	type ContentFrameProps,
	CopyButton,
	type CopyButtonProps,
	DataTableOverlay,
	type DataTableOverlayProps,
	type DiffViewerSettings,
	DocumentFormattedMarkdownOverlay,
	type DocumentFormattedMarkdownOverlayProps,
	detectLanguage,
	detectLanguageFromPath,
	type FileChange,
	// Base overlay components
	FullscreenOverlayBase,
	FullscreenOverlayBaseHeader,
	type FullscreenOverlayBaseHeaderProps,
	type FullscreenOverlayBaseProps,
	GenericOverlay,
	type GenericOverlayProps,
	ImagePreviewOverlay,
	type ImagePreviewOverlayProps,
	JSONPreviewOverlay,
	type JSONPreviewOverlayProps,
	MultiDiffPreviewOverlay,
	type MultiDiffPreviewOverlayProps,
	type OverlayTypeBadge,
	PDFPreviewOverlay,
	type PDFPreviewOverlayProps,
	PreviewOverlay,
	type PreviewOverlayProps,
	TerminalPreviewOverlay,
	type TerminalPreviewOverlayProps,
} from "./components/overlay";

// Terminal components
export {
	ANSI_COLORS,
	type AnsiSpan,
	type GrepLine,
	isGrepContentOutput,
	parseAnsi,
	parseGrepOutput,
	stripAnsi,
	TerminalOutput,
	type TerminalOutputProps,
	type ToolType,
} from "./components/terminal";
// Tooltip
export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./components/tooltip";
// UI primitives
export {
	type AnchorX,
	type AnchorY,
	BrowserControls,
	type BrowserControlsProps,
	type BrowserEmptyPromptSample,
	BrowserEmptyStateCard,
	type BrowserEmptyStateCardProps,
	BrowserShader,
	type BrowserShaderProps,
	DropdownMenu,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuTrigger,
	FilterableSelectPopover,
	type FilterableSelectPopoverProps,
	type FilterableSelectRenderState,
	Island,
	type IslandActiveViewSize,
	IslandContentView,
	type IslandContentViewProps,
	type IslandDialogBehavior,
	IslandFollowUpContentView,
	type IslandFollowUpContentViewProps,
	type IslandFollowUpMode,
	type IslandMorphTarget,
	type IslandNavigation,
	type IslandProps,
	type IslandTransitionConfig,
	PREVIEW_BADGE_VARIANTS,
	type PreviewBadgeVariant,
	PreviewHeader,
	PreviewHeaderBadge,
	type PreviewHeaderBadgeProps,
	type PreviewHeaderProps,
	SimpleDropdown,
	SimpleDropdownItem,
	type SimpleDropdownItemProps,
	type SimpleDropdownProps,
	Spinner,
	type SpinnerProps,
	StyledDropdownMenuContent,
	StyledDropdownMenuItem,
	StyledDropdownMenuSeparator,
	StyledDropdownMenuSubContent,
	StyledDropdownMenuSubTrigger,
	useIslandNavigation,
} from "./components/ui";
// Context
export {
	type PlatformActions,
	PlatformProvider,
	type PlatformProviderProps,
	ShikiThemeProvider,
	type ShikiThemeProviderProps,
	usePlatform,
	useShikiTheme,
} from "./context";
export {
	type DismissibleLayerBridge,
	type DismissibleLayerRegistration,
	type DismissibleLayerSnapshot,
	type DismissibleLayerType,
	getDismissibleLayerBridge,
	setDismissibleLayerBridge,
} from "./lib/dismissible-layer-bridge";
// File classification (for link interceptor)
export {
	classifyFile,
	type FileClassification,
	type FilePreviewType,
} from "./lib/file-classification";
// Layout constants and hooks
export {
	CHAT_CLASSES,
	CHAT_LAYOUT,
	OVERLAY_LAYOUT,
	type OverlayMode,
	useOverlayMode,
} from "./lib/layout";
// Tool result parsers
export {
	type BashResult,
	type CodeOverlayData,
	type DocumentOverlayData,
	extractOverlayCards,
	extractOverlayData,
	type GenericOverlayData,
	type GlobResult,
	type GrepResult,
	type JSONOverlayData,
	type OverlayCard,
	type OverlayData,
	parseBashResult,
	parseGlobResult,
	parseGrepResult,
	parseReadResult,
	type ReadResult,
	type TerminalOverlayData,
} from "./lib/tool-parsers";
// Utilities
export { cn } from "./lib/utils";
