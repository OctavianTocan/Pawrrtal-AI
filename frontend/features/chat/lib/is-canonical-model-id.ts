/**
 * Pure regex matcher for the canonical pawrrtal model-ID wire form.
 *
 * Mirrors the backend's `parse_model_id` regex
 * (`backend/app/core/models/registry.py`). Used as the `usePersistedState`
 * validator for `chat-composer:selected-model-id`, so stale or
 * hand-edited localStorage values get rejected before they reach the
 * model picker or the chat router.
 *
 * @fileoverview Canonical wire form: `host:vendor/model`. The host
 *   prefix (e.g. `agent-sdk:`) is optional on the wire and canonicalised
 *   on the server, so the regex accepts both shapes.
 */

/**
 * Canonical model-ID wire-form pattern.
 *
 * Anchors:
 * - optional `host:` prefix (lowercase, may contain dashes)
 * - required `vendor/` segment (same charset)
 * - required `model` segment (lowercase alphanumeric, may contain
 *   `.`, `-`, `_`)
 *
 * Mirrors the backend regex exactly so client-side acceptance matches
 * server-side acceptance.
 */
const CANONICAL_MODEL_ID_RE = /^([a-z][a-z0-9-]*:)?[a-z][a-z0-9-]*\/[a-z0-9][a-z0-9.\-_]*$/;

/**
 * Returns `true` if `s` matches the canonical model-ID structure.
 *
 * Does **not** check catalog membership — that is a server concern.
 * The check exists purely so a malformed string (e.g. a stale legacy
 * slug, a copy-paste with whitespace, or `null` from cleared storage)
 * can be detected at the boundary and replaced with the catalog
 * default.
 *
 * @param s - Candidate value, typically read from `localStorage` or a
 *   URL param.
 * @returns Type-narrowing predicate: when `true`, `s` is a `string`
 *   matching the canonical wire form.
 */
export function isCanonicalModelId(s: unknown): s is string {
	return typeof s === 'string' && CANONICAL_MODEL_ID_RE.test(s);
}
