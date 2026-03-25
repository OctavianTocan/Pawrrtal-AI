import * as React from "react";

import { cn } from "@/lib/utils";

type TopBarButtonProps = React.ComponentProps<"button"> & {
	isActive?: boolean;
};

export const TopBarButton = React.forwardRef<
	HTMLButtonElement,
	TopBarButtonProps
>(({ children, className, disabled, isActive, ...props }, ref) => {
	return (
		<button
			ref={ref}
			type="button"
			disabled={disabled}
			className={cn(
				"text-foreground/70 flex h-8 w-8 items-center justify-center rounded-[8px] transition-[background-color,color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
				"hover:bg-foreground/[0.045] hover:text-foreground active:bg-foreground/[0.06] focus:outline-none focus-visible:ring-0",
				"disabled:pointer-events-none disabled:opacity-30",
				isActive && "bg-foreground/[0.055] text-foreground",
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
});

TopBarButton.displayName = "TopBarButton";
