'use strict';

/**
 * Lightweight YAML parser for frontmatter.
 * Handles the flat key-value pairs and single-level arrays we use.
 * No external dependencies.
 */

function parse(text) {
	const result = {};
	const lines = text.split('\n');
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		// Skip blank lines
		if (!line.trim()) {
			i++;
			continue;
		}

		// Array item: - "value" or - value
		if (/^\s*-\s/.test(line)) {
			// This belongs to the previous key — handled below
			i++;
			continue;
		}

		// Key: value
		const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
		if (!match) {
			i++;
			continue;
		}

		const key = match[1];
		const value = match[2].trim();

		if (value === '') {
			// Could be array or null. Look ahead for array items.
			const items = [];
			let j = i + 1;
			while (j < lines.length && /^\s*-\s/.test(lines[j])) {
				let item = lines[j].replace(/^\s*-\s*/, '').trim();
				// Remove surrounding quotes
				if (
					(item.startsWith('"') && item.endsWith('"')) ||
					(item.startsWith("'") && item.endsWith("'"))
				) {
					item = item.slice(1, -1);
				}
				items.push(item);
				j++;
			}
			if (items.length > 0) {
				result[key] = items;
				i = j;
				continue;
			}
			result[key] = null;
		} else if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			result[key] = value.slice(1, -1);
		} else if (value === 'true') {
			result[key] = true;
		} else if (value === 'false') {
			result[key] = false;
		} else if (value.startsWith('[') && value.endsWith(']')) {
			// Inline array: ["a", "b"] — split respecting quoted strings
			const inner = value.slice(1, -1);
			const items = [];
			let current = '';
			let inQuote = false;
			let quoteChar = '';
			for (let c = 0; c < inner.length; c++) {
				const ch = inner[c];
				if (inQuote) {
					if (ch === quoteChar) {
						inQuote = false;
					}
					current += ch;
				} else if (ch === '"' || ch === "'") {
					inQuote = true;
					quoteChar = ch;
					current += ch;
				} else if (ch === ',') {
					items.push(current.trim().replace(/^["']|["']$/g, ''));
					current = '';
				} else {
					current += ch;
				}
			}
			if (current.trim()) {
				items.push(current.trim().replace(/^["']|["']$/g, ''));
			}
			result[key] = items.filter(Boolean);
		} else if (!isNaN(Number(value))) {
			result[key] = Number(value);
		} else {
			result[key] = value;
		}

		i++;
	}

	return result;
}

module.exports = { parse };
