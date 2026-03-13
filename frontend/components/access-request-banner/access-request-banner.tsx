"use client";

import { IconChevronDown, IconX } from "@tabler/icons-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import {
	Avatar,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from "@/components/ui/avatar";
import { DecisionPill } from "./decision-pill";
import { SummaryText } from "./summary-text";
import {
	type AccessRequestBannerProps,
	BOUNCY_SPRING,
	type Decision,
	EXPAND_SPRING,
	getInitials,
} from "./types";

/** Max real avatars shown in collapsed bar; rest become "+N" count */
const MAX_COLLAPSED_AVATARS = 2;

/**
 * Collapsible notification banner for pending access requests.
 *
 * **Collapsed:** avatar group (max 2 real + count bubble), highlighted
 * summary text, bouncy chevron, dismiss button. Click anywhere to expand.
 *
 * **Expanded:** "Access Requests" title replaces summary text (crossfade),
 * avatars animate from their collapsed position into their expanded row
 * positions using shared `layoutId`. Per-user rows with sliding
 * approve/reject pill toggles stagger in.
 *
 * Avatars stack left-to-right (leftmost on top) using z-index ordering.
 *
 * @example
 * ```tsx
 * <AccessRequestBanner
 *   requests={[{ id: "1", name: "Octavian Tocan" }]}
 *   onApprove={(id) => console.log("approved", id)}
 *   onReject={(id) => console.log("rejected", id)}
 *   onDismiss={() => console.log("dismissed")}
 * />
 * ```
 */
export function AccessRequestBanner({
	requests,
	onApprove,
	onReject,
	onDismiss,
}: AccessRequestBannerProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	/* Track decisions locally so the banner can show decided state inline */
	const [decisions, setDecisions] = useState<Record<string, Decision>>({});
	/* Incrementing key forces AnimatePresence to re-mount the expanded list
	   on every toggle, so initial/animate always fires (not just first time).
	   See motion-patterns.md: "AnimatePresence Gotcha: Re-animation" */
	const [expandKey, setExpandKey] = useState(0);

	const handleApprove = (id: string) => {
		setDecisions((prev) => ({ ...prev, [id]: "approved" }));
		onApprove?.(id);
	};

	const handleReject = (id: string) => {
		setDecisions((prev) => ({ ...prev, [id]: "rejected" }));
		onReject?.(id);
	};

	const handleReset = (id: string) => {
		setDecisions((prev) => ({ ...prev, [id]: "undecided" }));
	};

	const toggleExpand = () => {
		setIsExpanded((prev) => {
			if (!prev) {
				/* Bump key on every expand so AnimatePresence re-mounts children,
				   triggering fresh initial -> animate on the staggered rows */
				setExpandKey((k) => k + 1);
			}
			return !prev;
		});
	};

	if (requests.length === 0) return null;

	const remainingCount = Math.max(0, requests.length - MAX_COLLAPSED_AVATARS);
	const collapsedAvatars = requests.slice(0, MAX_COLLAPSED_AVATARS);

	return (
		<LayoutGroup>
			<motion.div
				layout
				transition={EXPAND_SPRING}
				className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
			>
				{/* Header bar: clickable anywhere to toggle expand.
				    Uses div+role="button" because it contains nested interactive
				    children (dismiss button). Nesting <button> in <button> is invalid. */}
				{/* biome-ignore lint/a11y/useSemanticElements: contains nested interactive children */}
				<div
					role="button"
					tabIndex={0}
					onClick={toggleExpand}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggleExpand();
						}
					}}
					className="flex cursor-pointer items-center gap-3 px-4 py-3"
				>
					{/* Collapsed avatars: only rendered when NOT expanded.
					    When expanded, the rows contain avatars with matching layoutIds,
					    so Motion animates avatars bouncing from header into rows.
					    Avatars use descending z-index so leftmost is visually on top.
					    Using default size (size-8) so they match multi-line text height. */}
					{!isExpanded && (
						<AvatarGroup>
							{collapsedAvatars.map((r, i) => (
								<motion.div
									key={r.id}
									layoutId={`avatar-${r.id}`}
									transition={BOUNCY_SPRING}
									/* Leftmost avatar gets highest z-index so it stacks on top */
									style={{
										zIndex: collapsedAvatars.length - i + 1,
									}}
								>
									<Avatar>
										{r.avatarUrl && (
											<AvatarImage src={r.avatarUrl} alt={r.name} />
										)}
										<AvatarFallback>{getInitials(r.name)}</AvatarFallback>
									</Avatar>
								</motion.div>
							))}
							{remainingCount > 0 && (
								<AvatarGroupCount>
									<span className="text-xs">+{remainingCount}</span>
								</AvatarGroupCount>
							)}
						</AvatarGroup>
					)}

					{/* Text area: crossfade between summary and title.
					   Both items are absolutely positioned so scale transforms
					   don't affect layout or push siblings around. The container
					   has a min-height to hold space. */}
					<div className="relative min-h-[1.25rem] min-w-0 flex-1">
						<AnimatePresence mode="wait" initial={false}>
							{isExpanded ? (
								<motion.div
									key="title"
									className="absolute inset-0"
									/* Scale from top edge, purely visual transform */
									initial={{ opacity: 0, scaleY: 0 }}
									animate={{ opacity: 1, scaleY: 1 }}
									exit={{
										opacity: 0,
										scaleY: 0,
										transition: { duration: 0.1 },
									}}
									transition={BOUNCY_SPRING}
									style={{ transformOrigin: "top" }}
								>
									<span className="text-sm font-semibold text-foreground">
										Access Requests
									</span>
								</motion.div>
							) : (
								<motion.div
									key="summary"
									className="absolute inset-0 line-clamp-2"
									/* Scale from top edge, purely visual transform */
									initial={{ opacity: 0, scaleY: 0 }}
									animate={{ opacity: 1, scaleY: 1 }}
									exit={{
										opacity: 0,
										scaleY: 0,
										transition: { duration: 0.1 },
									}}
									transition={BOUNCY_SPRING}
									style={{ transformOrigin: "top" }}
								>
									<SummaryText requests={requests} />
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Chevron rotates 180 degrees with bounce */}
					<motion.div
						animate={{ rotate: isExpanded ? 180 : 0 }}
						transition={BOUNCY_SPRING}
						className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<IconChevronDown className="size-4" />
					</motion.div>

					{/* Dismiss: stopPropagation prevents triggering expand toggle */}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDismiss?.();
						}}
						className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="Dismiss"
					>
						<IconX className="size-4" />
					</button>
				</div>

				{/* Expanded user list: key changes on every expand to force
				    AnimatePresence to re-mount, giving fresh stagger animations */}
				<AnimatePresence>
					{isExpanded && (
						<motion.div
							key={expandKey}
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={EXPAND_SPRING}
							className="overflow-hidden"
						>
							<div className="border-t border-border" />
							<div className="py-1">
								{requests.map((request) => (
									<motion.div
										key={request.id}
										/* All rows appear at once (no stagger).
										   Names bounce-scale from small to full size,
										   pills scale up with a slight bounce. */
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ duration: 0.15 }}
										className="flex items-center justify-between gap-3 px-4 py-2"
									>
										<div className="flex items-center gap-3">
											{/* layoutId matches the collapsed avatar so Motion
											    bounces it from the header into this row position */}
											<motion.div
												layoutId={`avatar-${request.id}`}
												transition={BOUNCY_SPRING}
											>
												<Avatar size="sm">
													{request.avatarUrl && (
														<AvatarImage
															src={request.avatarUrl}
															alt={request.name}
														/>
													)}
													<AvatarFallback>
														{getInitials(request.name)}
													</AvatarFallback>
												</Avatar>
											</motion.div>
											{/* Name bounces in via scale for a playful feel */}
											<motion.span
												className="text-sm font-medium"
												initial={{ scale: 0.7, opacity: 0 }}
												animate={{ scale: 1, opacity: 1 }}
												transition={BOUNCY_SPRING}
											>
												{request.name}
											</motion.span>
										</div>
										{/* Pill scales up with bounce to draw attention */}
										<motion.div
											initial={{ scale: 0.85, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											transition={BOUNCY_SPRING}
										>
											<DecisionPill
												pillId={request.id}
												decision={decisions[request.id] ?? "undecided"}
												onApprove={() => handleApprove(request.id)}
												onReject={() => handleReject(request.id)}
												onReset={() => handleReset(request.id)}
											/>
										</motion.div>
									</motion.div>
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</LayoutGroup>
	);
}
