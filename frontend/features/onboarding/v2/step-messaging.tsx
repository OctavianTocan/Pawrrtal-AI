'use client';

import { Check } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import {
	MESSAGING_CHANNELS,
	type MessagingChannelId,
	type PersonalizationProfile,
} from '@/features/personalization/storage';
import { cn } from '@/lib/utils';
import { OnboardingShell } from './onboarding-shell';

/** Props for {@link StepMessaging}. */
export interface StepMessagingProps {
	profile: PersonalizationProfile;
	onPatch: (patch: Partial<PersonalizationProfile>) => void;
	onFinish: () => void;
}

/**
 * Step 4 — connect at least one messaging channel.
 *
 * Visual-only today. Clicking Connect on any row "connects" by toggling
 * the channel ID into `connectedChannels`. Continue is disabled until
 * at least one channel is in the list.
 */
export function StepMessaging({
	profile,
	onPatch,
	onFinish,
}: StepMessagingProps): React.JSX.Element {
	const connected = profile.connectedChannels ?? [];
	const hasOne = connected.length > 0;

	const toggleChannel = (id: MessagingChannelId): void => {
		const next = connected.includes(id)
			? connected.filter((entry) => entry !== id)
			: [...connected, id];
		onPatch({ connectedChannels: next });
	};

	return (
		<OnboardingShell
			footer={
				<Button
					className="h-11 w-full max-w-sm cursor-pointer rounded-control bg-foreground px-8 text-sm font-semibold text-background shadow-none hover:bg-foreground/90 hover:shadow-minimal"
					disabled={!hasOne}
					onClick={onFinish}
					size="lg"
					type="button"
				>
					Continue
				</Button>
			}
			subtitle="Connect at least one messaging channel to continue."
			title="Connect Messaging"
		>
			<div className="flex flex-col gap-2.5">
				{MESSAGING_CHANNELS.map((channel) => {
					const isConnected = connected.includes(channel.id);
					return (
						<div
							className="flex items-center justify-between gap-3 rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-4 py-3"
							key={channel.id}
						>
							<div className="flex items-center gap-3">
								<span
									aria-hidden="true"
									className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white"
									style={{ backgroundColor: channel.color }}
								>
									{channel.label.charAt(0)}
								</span>
								<span className="text-sm font-medium text-foreground">
									Connect {channel.label}
								</span>
							</div>
							<Button
								className={cn(
									'h-9 min-w-24 cursor-pointer px-4',
									isConnected && 'bg-success text-background hover:bg-success/85'
								)}
								onClick={() => toggleChannel(channel.id)}
								size="sm"
								type="button"
								variant={isConnected ? 'default' : 'default'}
							>
								{isConnected ? (
									<>
										<Check aria-hidden="true" className="mr-1 size-3.5" />
										Connected
									</>
								) : (
									'Connect'
								)}
							</Button>
						</div>
					);
				})}
			</div>
		</OnboardingShell>
	);
}
