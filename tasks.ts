#!/usr/bin/env bun
/**
 * tasks.ts — Display active AI Nexus tasks from Notion via MCPorter.
 *
 * Usage:
 *   just tasks          # show all open tasks
 *   just tasks-auth     # one-time Notion OAuth setup
 */
import { callOnce } from "mcporter";

// ── Notion data source for the "AI Nexus Tasks" database ──────────────────────
const COLLECTION = "collection://c11041dc-8621-4742-8e5a-0ec0e1efcc17";

// ── Display helpers ───────────────────────────────────────────────────────────
const PRIORITY: Record<string, string> = {
	Critical: "\x1b[31m●\x1b[0m", // red
	High: "\x1b[33m●\x1b[0m", // orange/yellow
	Medium: "\x1b[93m●\x1b[0m", // bright yellow
	Low: "\x1b[32m●\x1b[0m", // green
};

const STATUS: Record<string, string> = {
	"Not Started": "\x1b[90m○\x1b[0m", // gray
	"In Progress": "\x1b[34m◉\x1b[0m", // blue
};

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";

interface Task {
	"Task ID": string;
	Task: string;
	Status: string | null;
	Priority: string;
	Sprint: string;
	Category: string;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
	const result = await callOnce({
		server: "notion",
		toolName: "notion-query-data-sources",
		args: {
			data: {
				data_source_urls: [COLLECTION],
				query: `SELECT "Task ID", "Task", "Status", "Priority", "Sprint", "Category" FROM "${COLLECTION}" WHERE "Status" != 'Done' ORDER BY "Sort Order" ASC`,
			},
		},
	});

	const { results: tasks } = result.json() as { results: Task[] };

	if (!tasks.length) {
		console.log(`\n  ${BOLD}✅ All tasks done! Nothing to do.${RESET}\n`);
		return;
	}

	// Count by status
	const inProgress = tasks.filter((t) => t.Status === "In Progress").length;
	const notStarted = tasks.length - inProgress;

	console.log(
		`\n  ${BOLD}📋 AI Nexus Tasks${RESET}  ${DIM}${tasks.length} open (${inProgress} in progress, ${notStarted} not started)${RESET}\n`,
	);

	// Group by sprint
	const sprints = new Map<string, Task[]>();
	for (const t of tasks) {
		const s = t.Sprint || "Unscheduled";
		sprints.set(s, [...(sprints.get(s) ?? []), t]);
	}

	for (const [sprint, items] of sprints) {
		const bar = "─".repeat(Math.max(0, 56 - sprint.length));
		console.log(`  ${CYAN}${BOLD}${sprint}${RESET} ${DIM}${bar}${RESET}`);

		for (const t of items) {
			const status = STATUS[t.Status ?? "Not Started"] ?? STATUS["Not Started"];
			const priority = PRIORITY[t.Priority] ?? "⚪";
			const id = `#${t["Task ID"]}`.padEnd(5);
			const cat = `[${t.Category}]`.padEnd(14);
			console.log(
				`    ${status} ${priority} ${DIM}${id}${RESET} ${DIM}${cat}${RESET} ${t.Task}`,
			);
		}
		console.log();
	}
}

main().catch((err) => {
	console.error(`\n  ❌ Failed to fetch tasks: ${err.message}\n`);
	console.error(
		`  ${DIM}Run \`just tasks-auth\` to authenticate with Notion first.${RESET}\n`,
	);
	process.exit(1);
});
