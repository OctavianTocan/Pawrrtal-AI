/**
 * Fumadocs loader instances for the handbook and product collections.
 *
 * Two distinct `baseUrl`s drive the two route segments
 * (`/docs/handbook/**`, `/docs/product/**`). Each loader is the
 * single entry point its segment's pages and layout use to read MDX
 * metadata and the page tree.
 */

import { handbookDocs, productDocs } from 'collections/server';
import { loader } from 'fumadocs-core/source';

/** Curated, public-safe internal handbook. */
export const handbookSource = loader({
	baseUrl: '/docs/handbook',
	source: handbookDocs.toFumadocsSource(),
});

/** User-facing product documentation. */
export const productSource = loader({
	baseUrl: '/docs/product',
	source: productDocs.toFumadocsSource(),
});
