/**
 * Single source of truth for the product's name, slug, and themed identity.
 *
 * Renaming the product is a one-file edit (this one) plus a commit.  Every
 * user-visible string in the frontend reads from these constants rather
 * than hardcoding the name, so the next rename ("Pawrrtal" → whatever) is
 * trivial and merge-safe.
 *
 * If you find yourself typing "Pawrrtal" or "pawrrtal" in code, import the
 * relevant constant from here instead.  The lint policy in
 * `.claude/rules/general/branding-via-constants.md` enforces this for new
 * code; the rename PR migrated all pre-existing references in one sweep.
 *
 * Mirror in `backend/app/core/branding.py` — keep the two in sync.
 */

/** Title-cased product name as users see it in UI strings. */
export const PRODUCT_NAME = 'Pawrrtal' as const;

/** kebab-case slug used in URLs, package names, identifiers. */
export const PRODUCT_SLUG = 'pawrrtal' as const;

/** Domain hint for marketing copy and email-from defaults. */
export const PRODUCT_DOMAIN = 'pawrrtal.app' as const;

/** Tagline / one-liner used by onboarding + marketing surfaces. */
export const PRODUCT_TAGLINE = 'Your purr-sonal AI workspace.' as const;

/**
 * Theme identifier — drives palette + iconography.  Cat-themed at the
 * moment because cute sells; rotating the theme is a one-string edit
 * here plus updating the matching token set in `app/globals.css`.
 */
export const PRODUCT_THEME = 'cat' as const;

/**
 * License under which the project is distributed.  See `LICENSE` at the
 * repo root for the full text.
 *
 * FSL-1.1-Apache-2.0 is a source-available license that converts to
 * Apache-2.0 two years after each release, blocking only commercial
 * competing use in the meantime.  Pragmatic pick for "open-ish but
 * might commercialize" — strict enough to deter clones, lenient
 * enough to attract contributors and self-hosters.
 */
export const PRODUCT_LICENSE = 'FSL-1.1-Apache-2.0' as const;

/** Convenience helpers so call sites read naturally. */
export const product = {
	name: PRODUCT_NAME,
	slug: PRODUCT_SLUG,
	domain: PRODUCT_DOMAIN,
	tagline: PRODUCT_TAGLINE,
	theme: PRODUCT_THEME,
	license: PRODUCT_LICENSE,
} as const;

export type ProductBranding = typeof product;
