'use client';

/**
 * Wraps json-render's `<Renderer>` with the Pawrrtal catalog + providers.
 *
 * @fileoverview Used by both `<ArtifactCard>` (in-line preview) and
 * `<ArtifactDialog>` (full-screen viewer). Encapsulates the registry +
 * provider plumbing so callers don't repeat them.
 */

import { defineRegistry, JSONUIProvider, Renderer } from '@json-render/react';
import type { ReactNode } from 'react';
import type { ChatArtifactPayload } from '../types';
import { artifactCatalog } from './catalog';
import { artifactComponents } from './components';

// Registry creation is module-level: the catalog + components are static so
// rebuilding the registry on every render would be pure waste.
const { registry } = defineRegistry(artifactCatalog, { components: artifactComponents });

interface ArtifactRendererProps {
	artifact: ChatArtifactPayload;
}

export function ArtifactRenderer({ artifact }: ArtifactRendererProps): ReactNode {
	return (
		<JSONUIProvider registry={registry}>
			<Renderer spec={artifact.spec} registry={registry} />
		</JSONUIProvider>
	);
}
