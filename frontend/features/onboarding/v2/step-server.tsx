'use client';

import { ArrowRight, CheckCircle2Icon, CloudIcon, ServerIcon } from 'lucide-react';
import type * as React from 'react';
import { useCallback, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PersonalizationProfile } from '@/features/personalization/storage';
import { cn } from '@/lib/utils';
import { OnboardingShell } from './onboarding-shell';

/** Props for {@link StepServer}. */
export interface StepServerProps {
	profile: PersonalizationProfile;
	onPatch: (patch: Partial<PersonalizationProfile>) => void;
	onContinue: () => void;
	onSkip: () => void;
}

type ServerMode = 'hosted' | 'self-hosted';

/**
 * Validates that a URL string is an http/https URL pointing at a non-localhost
 * host.  Returns an error message or null when valid.
 */
function validateServerUrl(url: string): string | null {
	if (!url.trim()) return 'Please enter a server URL.';
	let parsed: URL;
	try {
		parsed = new URL(url.trim());
	} catch {
		return "That doesn't look like a valid URL. Include the scheme, e.g. https://pawrrtal.example.com";
	}
	if (!['http:', 'https:'].includes(parsed.protocol)) {
		return 'The URL must start with http:// or https://';
	}
	return null;
}

/**
 * Step — choose between the hosted Pawrrtal service and a self-hosted backend.
 *
 * When the user selects "Self-hosted" they see a URL field where they can
 * enter the address of their own deployment (e.g. on Railway, a VPS, or the
 * Docker Compose stack from this repo).  On "Continue" the URL is saved to
 * the personalization profile.
 *
 * "Using the hosted service" skips the URL input and stores an empty string,
 * which the app treats as "same-origin / default".
 */
interface ServerModeToggleProps {
	mode: ServerMode;
	onSelect: (next: ServerMode) => void;
}

/**
 * Hosted/self-hosted segmented toggle. Two large tap targets with icon +
 * description; the selected one shows a soft highlight.
 */
function ServerModeToggle({ mode, onSelect }: ServerModeToggleProps): React.JSX.Element {
	return (
		<div className="flex flex-col gap-2">
			<button
				type="button"
				onClick={() => onSelect('hosted')}
				className={cn(
					'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors duration-150',
					mode === 'hosted'
						? 'border-foreground/30 bg-foreground/[0.04]'
						: 'border-border hover:border-foreground/20 hover:bg-foreground/[0.02]'
				)}
			>
				<CloudIcon
					aria-hidden="true"
					className={cn(
						'mt-0.5 size-5 shrink-0',
						mode === 'hosted' ? 'text-foreground' : 'text-muted-foreground'
					)}
				/>
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium text-foreground">Hosted by Pawrrtal</span>
					<span className="text-[13px] text-muted-foreground">
						Use the default cloud deployment. No configuration needed.
					</span>
				</div>
			</button>

			<button
				type="button"
				onClick={() => onSelect('self-hosted')}
				className={cn(
					'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors duration-150',
					mode === 'self-hosted'
						? 'border-foreground/30 bg-foreground/[0.04]'
						: 'border-border hover:border-foreground/20 hover:bg-foreground/[0.02]'
				)}
			>
				<ServerIcon
					aria-hidden="true"
					className={cn(
						'mt-0.5 size-5 shrink-0',
						mode === 'self-hosted' ? 'text-foreground' : 'text-muted-foreground'
					)}
				/>
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium text-foreground">Self-hosted</span>
					<span className="text-[13px] text-muted-foreground">
						Connect to your own backend — Railway, VPS, or local Docker.
					</span>
				</div>
			</button>
		</div>
	);
}

interface ServerUrlFieldProps {
	inputId: string;
	url: string;
	urlError: string | null;
	verified: boolean;
	verifying: boolean;
	onUrlChange: (next: string) => void;
	onVerify: () => void;
}

/**
 * URL input + verify button + inline feedback.  Only rendered when the
 * user picked the self-hosted mode.  Keeps `step-server.tsx`'s top-level
 * component under the cognitive-complexity / function-length budget.
 */
function ServerUrlField({
	inputId,
	url,
	urlError,
	verified,
	verifying,
	onUrlChange,
	onVerify,
}: ServerUrlFieldProps): React.JSX.Element {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
				Server URL
			</label>
			<div className="flex gap-2">
				<Input
					id={inputId}
					type="url"
					placeholder="https://pawrrtal.mycompany.com"
					value={url}
					onChange={(e) => onUrlChange(e.target.value)}
					className={cn(
						'h-10 flex-1 text-[13px]',
						urlError ? 'border-destructive focus-visible:ring-destructive/30' : ''
					)}
				/>
				<button
					type="button"
					onClick={onVerify}
					disabled={verifying || !url.trim()}
					className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground-5 disabled:pointer-events-none disabled:opacity-50"
				>
					{verifying ? 'Checking…' : verified ? 'Re-check' : 'Verify'}
				</button>
			</div>

			{urlError ? (
				<p className="text-[12px] text-destructive">{urlError}</p>
			) : verified ? (
				<p className="flex items-center gap-1 text-[12px] text-emerald-600 dark:text-emerald-400">
					<CheckCircle2Icon aria-hidden="true" className="size-3.5" />
					Server reachable — you're good to go.
				</p>
			) : null}

			<p className="text-[12px] text-muted-foreground">
				Run your own backend with{' '}
				<code className="rounded bg-foreground/[0.06] px-1 py-0.5 font-mono text-[11px]">
					docker compose up
				</code>{' '}
				or deploy to Railway. See{' '}
				<a
					href="https://github.com/OctavianTocan/ai-nexus/blob/main/docs/docker.md"
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-2 hover:text-foreground"
				>
					docs/docker.md
				</a>{' '}
				for setup instructions.
			</p>
		</div>
	);
}

export function StepServer({
	profile,
	onPatch,
	onContinue,
	onSkip,
}: StepServerProps): React.JSX.Element {
	const serverUrlId = useId();
	const [mode, setMode] = useState<ServerMode>(() =>
		profile.remoteServerUrl ? 'self-hosted' : 'hosted'
	);
	const [url, setUrl] = useState<string>(profile.remoteServerUrl ?? '');
	const [urlError, setUrlError] = useState<string | null>(null);
	const [verified, setVerified] = useState(false);
	const [verifying, setVerifying] = useState(false);

	const handleModeSelect = useCallback((next: ServerMode) => {
		setMode(next);
		setUrlError(null);
		setVerified(false);
	}, []);

	const handleVerify = useCallback(async () => {
		const error = validateServerUrl(url);
		if (error) {
			setUrlError(error);
			return;
		}
		setUrlError(null);
		setVerifying(true);
		try {
			// Ping the health endpoint — a 200 with any body is enough.
			const res = await fetch(`${url.trim()}/api/v1/health`, {
				signal: AbortSignal.timeout(6000),
			});
			if (res.ok || res.status < 500) {
				setVerified(true);
			} else {
				setUrlError(
					`Server responded with HTTP ${res.status}. Check the URL and try again.`
				);
			}
		} catch {
			setUrlError(
				'Could not reach the server. Check the URL, your network, or the server logs.'
			);
		} finally {
			setVerifying(false);
		}
	}, [url]);

	const handleContinue = useCallback(() => {
		if (mode === 'hosted') {
			onPatch({ remoteServerUrl: '' });
			onContinue();
			return;
		}
		// Self-hosted path: validate before proceeding.
		const error = validateServerUrl(url);
		if (error) {
			setUrlError(error);
			return;
		}
		onPatch({ remoteServerUrl: url.trim() });
		onContinue();
	}, [mode, url, onPatch, onContinue]);

	const canContinue =
		mode === 'hosted' || (mode === 'self-hosted' && url.trim().length > 0 && !urlError);

	return (
		<OnboardingShell
			title="Where is your Pawrrtal backend?"
			subtitle="Pawrrtal can run hosted or on your own server. Pick what fits your setup."
			footer={
				<>
					<Button
						className="h-11 w-full max-w-sm cursor-pointer rounded-control bg-foreground px-8 text-sm font-semibold text-background shadow-none hover:bg-foreground/90 hover:shadow-minimal disabled:pointer-events-none disabled:opacity-50"
						disabled={!canContinue}
						onClick={handleContinue}
						size="lg"
						type="button"
					>
						Continue
						<ArrowRight aria-hidden="true" className="ml-1 size-4" />
					</Button>
					<button
						className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
						onClick={onSkip}
						type="button"
					>
						Skip for now
					</button>
				</>
			}
		>
			<div className="flex w-full max-w-md flex-col gap-6">
				<ServerModeToggle mode={mode} onSelect={handleModeSelect} />
				{mode === 'self-hosted' ? (
					<ServerUrlField
						inputId={serverUrlId}
						url={url}
						urlError={urlError}
						verified={verified}
						verifying={verifying}
						onUrlChange={(next) => {
							setUrl(next);
							setUrlError(null);
							setVerified(false);
						}}
						onVerify={handleVerify}
					/>
				) : null}
			</div>
		</OnboardingShell>
	);
}
