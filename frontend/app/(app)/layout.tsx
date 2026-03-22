"use client";

import { AppShell } from "@/components/shell/AppShell";
import { createWebContextValue } from "@/context/WebAppShellContext";
import { useMemo } from "react";

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const contextValue = useMemo(() => createWebContextValue(), []);

	return <AppShell contextValue={contextValue}>{children}</AppShell>;
}
