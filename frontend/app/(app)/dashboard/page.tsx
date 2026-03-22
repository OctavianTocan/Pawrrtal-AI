/**
 * Dashboard page - placeholder content.
 * The AppShell (sidebar + topbar) is provided by the parent layout.
 */
export default function Page() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<div className="bg-foreground/5 aspect-video rounded-xl" />
				<div className="bg-foreground/5 aspect-video rounded-xl" />
				<div className="bg-foreground/5 aspect-video rounded-xl" />
			</div>
			<div className="bg-foreground/5 min-h-[50vh] flex-1 rounded-xl" />
		</div>
	);
}
