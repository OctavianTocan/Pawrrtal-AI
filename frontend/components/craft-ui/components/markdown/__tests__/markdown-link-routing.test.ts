import { describe, expect, it } from "bun:test";
import { classifyMarkdownLinkTarget } from "../link-target";

describe("classifyMarkdownLinkTarget", () => {
	it("classifies absolute unix file paths as file", () => {
		expect(
			classifyMarkdownLinkTarget(
				"/Users/balintorosz/.craft-agent/sessions/abc/image.jpg",
			),
		).toBe("file");
	});

	it("classifies parent-relative file paths as file", () => {
		expect(
			classifyMarkdownLinkTarget("../downloads/assets/screenshot.png"),
		).toBe("file");
	});

	it("classifies repo-relative file paths as file", () => {
		expect(
			classifyMarkdownLinkTarget(
				"apps/electron/resources/docs/browser-tools.md",
			),
		).toBe("file");
	});

	it("classifies https links as url", () => {
		expect(classifyMarkdownLinkTarget("https://example.com/image.jpg")).toBe(
			"url",
		);
	});

	it("classifies mailto links as url", () => {
		expect(classifyMarkdownLinkTarget("mailto:test@example.com")).toBe("url");
	});
});
