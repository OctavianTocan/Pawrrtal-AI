"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EntityRow } from "@/components/ui/entity-row";
import { cn } from "@/lib/utils";

interface ConversationSidebarItemProps {
	id: string;
	title: string;
	updatedAt: string;
	showSeparator: boolean;
}

function formatConversationAge(updatedAt: string) {
	const date = new Date(updatedAt);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	const diffMs = date.getTime() - Date.now();
	const divisions = [
		{ amount: 60, unit: "second" },
		{ amount: 60, unit: "minute" },
		{ amount: 24, unit: "hour" },
		{ amount: 7, unit: "day" },
	] as const;
	let duration = Math.round(diffMs / 1000);

	for (const division of divisions) {
		if (Math.abs(duration) < division.amount) {
			return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
				duration,
				division.unit,
			);
		}

		duration = Math.round(duration / division.amount);
	}

	return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
		duration,
		"week",
	);
}

export function ConversationSidebarItem({
	id,
	title,
	updatedAt,
	showSeparator,
}: ConversationSidebarItemProps) {
	const pathname = usePathname();
	const href = `/c/${id}`;
	const isSelected = pathname === href;
	const age = formatConversationAge(updatedAt);

	return (
		<EntityRow
			asChild
			showSeparator={showSeparator}
			isSelected={isSelected}
			icon={
				<svg viewBox="0 0 25 24" fill="currentColor" aria-hidden="true">
					<g transform="translate(1.748, 0.7832)">
						<path
							fillRule="nonzero"
							d="M10.9952443,22 C8.89638276,22 7.01311428,21.5426195 5.34543882,20.6278586 C4.85718403,21.0547471 4.29283758,21.3901594 3.65239948,21.6340956 C3.01196138,21.8780319 2.3651823,22 1.71206226,22 C1.5028102,22 1.34111543,21.9466389 1.22697795,21.8399168 C1.11284047,21.7331947 1.05735697,21.6016979 1.06052745,21.4454262 C1.06369794,21.2891545 1.13820435,21.1347886 1.28404669,20.9823285 C1.5693904,20.6621622 1.77547197,20.3400901 1.9022914,20.0161123 C2.02911082,19.6921344 2.09252054,19.3090783 2.09252054,18.8669439 C2.09252054,18.4553015 2.02276985,18.0646223 1.88326848,17.6949064 C1.74376711,17.3251906 1.5693904,16.9383229 1.36013835,16.5343035 C1.15088629,16.1302841 0.941634241,15.6748094 0.732382188,15.1678794 C0.523130134,14.6609494 0.348753423,14.0682606 0.209252054,13.3898129 C0.0697506845,12.7113652 0,11.9147609 0,11 C0,9.40679141 0.271076524,7.93936244 0.813229572,6.5977131 C1.35538262,5.25606376 2.11946966,4.09164934 3.1054907,3.10446985 C4.09151175,2.11729037 5.25507998,1.35308385 6.59619542,0.811850312 C7.93731085,0.270616771 9.40366047,0 10.9952443,0 C12.5868281,0 14.0531777,0.270616771 15.3942931,0.811850312 C16.7354086,1.35308385 17.900562,2.11729037 18.8897536,3.10446985 C19.8789451,4.09164934 20.6446174,5.25606376 21.1867704,6.5977131 C21.7289235,7.93936244 22,9.40679141 22,11 C22,12.5932086 21.7289235,14.0606376 21.1867704,15.4022869 C20.6446174,16.7439362 19.8805303,17.9083507 18.8945093,18.8955301 C17.9084883,19.8827096 16.74492,20.6469161 15.4038046,21.1881497 C14.0626891,21.7293832 12.593169,22 10.9952443,22 Z"
						/>
					</g>
				</svg>
			}
			title={title}
			titleClassName={cn("text-[13px]", isSelected && "font-medium")}
			titleTrailing={
				age ? (
					<span className="text-[11px] text-foreground/40 whitespace-nowrap">
						{age}
					</span>
				) : undefined
			}
		>
			<Link href={href} className="absolute inset-0 rounded-[8px]" aria-label={title} />
		</EntityRow>
	);
}
