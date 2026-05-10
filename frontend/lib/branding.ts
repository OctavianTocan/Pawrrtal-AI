/**
 * Brand identity — single source of truth.
 *
 * All user-facing surfaces that print the product name should import
 * from here.  The marketing name has changed once already and will
 * change again, so this module exists to make the next rename a
 * one-line edit instead of a multi-hundred-file sweep.
 *
 * Convention:
 *   - `BRAND_NAME` — display string ("Pawrrtal").  Use in headings,
 *     toasts, page titles, anywhere the user reads the product name.
 *   - `BRAND_SLUG` — URL-/file-safe lowercase ("pawrrtal").  Use for
 *     storage keys, route segments, query params, etc.
 *   - `BRAND_TAGLINE` — short subtitle shown alongside the brand on
 *     marketing surfaces.  Optional; render conditionally.
 *
 * Keep this file dependency-free so it can be imported from anywhere
 * including pre-React boot code (electron main, server entrypoints).
 */

export const BRAND_NAME = 'Pawrrtal' as const;

export const BRAND_SLUG = 'pawrrtal' as const;

export const BRAND_TAGLINE = 'Your second brain, with claws.' as const;
