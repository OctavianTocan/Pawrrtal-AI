import { isFilePathTarget } from "./linkify";

/**
 * Classify markdown link targets for click dispatch.
 * File paths are handled by onFileClick; everything else is treated as a URL.
 */
export function classifyMarkdownLinkTarget(target: string): "file" | "url" {
	return isFilePathTarget(target) ? "file" : "url";
}
