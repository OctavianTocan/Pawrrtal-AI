/**
 * ProviderLogo — bundled monochrome SVG monograms for known providers.
 *
 * @fileoverview Eight inline SVG components keyed off the `ChatProviderSlug`
 * union. Unknown providers fall back to a generic dotted circle. Each glyph
 * is a 12×12 viewBox with `fill="currentColor"` so the consumer can tint via
 * Tailwind text-color utilities. Per-model overrides flow in via
 * {@link ChatModelOption.logo}.
 */

'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import type { ChatProviderSlug } from '../types';
import { cn } from '../utils/cn';

/** Props for a single provider logo SVG. */
interface ProviderLogoSvgProps {
	/** Extra classes merged onto the root SVG. */
	className?: string;
}

/** Anthropic — hexagram-style "A" mark. */
function AnthropicLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="currentColor"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<path d="M3 10 6 2l3 8H7.6L7 8.4H5L4.4 10H3Zm2.4-2.8h1.2L6 5.4l-.6 1.8Z" />
		</svg>
	);
}

/** OpenAI — circle/knot mark. */
function OpenAiLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.2"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<circle cx="6" cy="6" r="4" />
			<path d="M6 2v8M2 6h8" />
		</svg>
	);
}

/** Google — letter G in a roundel. */
function GoogleLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="currentColor"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<path d="M6 1.5a4.5 4.5 0 1 0 4.4 5.5H6V5.5h4.4a3.1 3.1 0 1 1-3-3 3 3 0 0 1 2.1.8l1-1A4.5 4.5 0 0 0 6 1.5Z" />
		</svg>
	);
}

/** Mistral — letter M as two peaks. */
function MistralLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="currentColor"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<path d="M1.5 10V2h1.6l2.9 4.2L8.9 2h1.6v8H9V4.3L6.4 8H5.6L3 4.3V10H1.5Z" />
		</svg>
	);
}

/** xAI — stylised X. */
function XaiLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="currentColor"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<path d="M2.4 2.2 6 5.8 9.6 2.2l1.4 1.4L7.4 7.2 11 10.8 9.6 12.2 6 8.6 2.4 12.2 1 10.8 4.6 7.2 1 3.6Z" />
		</svg>
	);
}

/** Meta — infinity-style loop. */
function MetaLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.2"
			strokeLinecap="round"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<path d="M2 7c1.5-3 3-3 4 0s2.5 3 4 0" />
		</svg>
	);
}

/** DeepSeek — diamond + dot. */
function DeepSeekLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="currentColor"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<path d="M6 1.5 10.5 6 6 10.5 1.5 6 6 1.5Zm0 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
		</svg>
	);
}

/** Qwen — letter Q. */
function QwenLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="currentColor"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<path d="M6 1.5a4.5 4.5 0 1 0 2.6 8.2l1.1 1.1 1.1-1.1-1-1A4.5 4.5 0 0 0 6 1.5Zm0 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
		</svg>
	);
}

/** Fallback used for unknown provider slugs. */
function GenericProviderLogo({ className }: ProviderLogoSvgProps): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 12 12"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.2"
			strokeDasharray="2 1.5"
			className={cn('size-3', className)}
			aria-hidden="true"
			role="img"
		>
			<circle cx="6" cy="6" r="4" />
		</svg>
	);
}

/** Known provider slugs that ship a bundled monogram. */
type KnownProviderSlug =
	| 'anthropic'
	| 'openai'
	| 'google'
	| 'mistral'
	| 'xai'
	| 'meta'
	| 'deepseek'
	| 'qwen';

const BUNDLED_PROVIDER_LOGOS: Record<
	KnownProviderSlug,
	(props: ProviderLogoSvgProps) => React.JSX.Element
> = {
	anthropic: AnthropicLogo,
	openai: OpenAiLogo,
	google: GoogleLogo,
	mistral: MistralLogo,
	xai: XaiLogo,
	meta: MetaLogo,
	deepseek: DeepSeekLogo,
	qwen: QwenLogo,
};

/** Props for {@link ProviderLogo}. */
export interface ProviderLogoProps {
	/** Provider slug — known providers get their bundled SVG. */
	provider: ChatProviderSlug;
	/** Per-model override — wins over the bundled logo when provided. */
	override?: ReactNode | string;
	/** Extra classes merged onto the SVG. */
	className?: string;
}

/**
 * Renders the provider logo for a model row.
 *
 * Resolution order:
 *   1. `override` — a per-model `ReactNode` or string URL passed from
 *      {@link ChatModelOption.logo}.
 *   2. The bundled monogram for known providers.
 *   3. A generic fallback dot-circle.
 *
 * @returns The provider logo as a 12×12 SVG (or an `<img>` when an override
 *   string URL is supplied).
 */
export function ProviderLogo({
	provider,
	override,
	className,
}: ProviderLogoProps): React.JSX.Element {
	if (typeof override === 'string') {
		return (
			// `override` URL renders as a square image; consumers control sizing
			// via the className prop.
			<Image
				src={override}
				alt=""
				aria-hidden="true"
				className={cn('size-3', className)}
				height={12}
				unoptimized
				width={12}
			/>
		);
	}
	if (override) {
		return <span className={cn('inline-flex size-3 items-center justify-center', className)}>{override}</span>;
	}
	const SvgComponent =
		BUNDLED_PROVIDER_LOGOS[provider as KnownProviderSlug] ?? GenericProviderLogo;
	return <SvgComponent className={className} />;
}
