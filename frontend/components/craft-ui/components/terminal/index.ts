/**
 * Terminal output components for displaying command results.
 */

export {
	ANSI_COLORS,
	type AnsiSpan,
	type GrepLine,
	isGrepContentOutput,
	parseAnsi,
	parseGrepOutput,
	stripAnsi,
} from "./ansi-parser";
export {
	TerminalOutput,
	type TerminalOutputProps,
	type ToolType,
} from "./TerminalOutput";
