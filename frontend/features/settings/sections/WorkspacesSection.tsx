/**
 * Settings → Workspaces — per-workspace environment variable overrides.
 *
 * Users can supply their own API keys here to override the gateway defaults.
 * Values are encrypted at rest and stored in /workspace/{user_id}/.env on the server.
 *
 * @fileoverview Workspaces settings section.
 */

'use client';

import { Eye, EyeOff, RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SettingsCard, SettingsPage, SettingsSectionHeader } from '@/features/settings/primitives';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { API_ENDPOINTS } from '@/lib/api';

interface WorkspaceEnvResponse {
	vars: Record<string, string>;
}

const OVERRIDABLE_KEYS = [
	{
		key: 'GEMINI_API_KEY',
		label: 'Gemini API Key',
		description: 'Google Gemini. Get a key from Google AI Studio.',
		placeholder: 'AIza...',
		url: 'https://aistudio.google.com/apikey',
	},
	{
		key: 'CLAUDE_CODE_OAUTH_TOKEN',
		label: 'Claude OAuth Token',
		description: 'Run claude setup-token while logged in to Claude Code to get this.',
		placeholder: 'sk-ant-...',
		url: 'https://docs.anthropic.com/en/docs/claude-code',
	},
	{
		key: 'EXA_API_KEY',
		label: 'Exa API Key',
		description: 'Powers web search. Get a key from exa.ai.',
		placeholder: 'Your Exa API key',
		url: 'https://exa.ai',
	},
	{
		key: 'XAI_API_KEY',
		label: 'xAI API Key',
		description: 'Speech-to-text. Get a key from xAI.',
		placeholder: 'Your xAI API key',
		url: 'https://x.ai',
	},
];

export function WorkspacesSection(): React.JSX.Element {
	const authedFetch = useAuthedFetch();
	const [envVars, setEnvVars] = useState<Record<string, string>>({});
	const [savedVars, setSavedVars] = useState<Record<string, string>>({});
	const [isDirty, setIsDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
	const [error, setError] = useState<string | null>(null);

	const fetchEnv = useCallback(async () => {
		try {
			const res = await authedFetch(API_ENDPOINTS.workspace.env);
			const data = (await res.json()) as WorkspaceEnvResponse;
			setEnvVars(data.vars);
			setSavedVars(data.vars);
			setIsDirty(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load environment variables');
		}
	}, [authedFetch]);

	useEffect(() => {
		void fetchEnv();
	}, [fetchEnv]);

	const handleChange = (key: string, value: string) => {
		setEnvVars((prev) => ({ ...prev, [key]: value }));
		setIsDirty(true);
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const res = await authedFetch(API_ENDPOINTS.workspace.env, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vars: envVars }),
			});
			const data = (await res.json()) as WorkspaceEnvResponse;
			setSavedVars(data.vars);
			setEnvVars(data.vars);
			setIsDirty(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDiscard = () => {
		setEnvVars(savedVars);
		setIsDirty(false);
	};

	const toggleShowToken = (key: string) => {
		setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	return (
		<SettingsPage
			description="Override gateway environment variables for your workspace. Leave blank to use the gateway default."
			title="Workspaces"
		>
			<SettingsCard
				description="Per-workspace environment variables override gateway defaults."
				title="Environment Variables"
			>
				<SettingsSectionHeader
					description="Values are encrypted at rest on the server."
					noDivider
					title="API Keys"
				/>
				<div className="flex flex-col gap-4 py-2">
					{OVERRIDABLE_KEYS.map(({ key, label, description, placeholder, url }) => (
						<div key={key} className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between">
								<label
									className="text-sm font-medium text-foreground"
									htmlFor={`env-${key}`}
								>
									{label}
								</label>
								<a
									className="text-xs text-muted-foreground underline"
									href={url}
									rel="noopener noreferrer"
									target="_blank"
								>
									Get key
								</a>
							</div>
							<div className="relative flex items-center">
								<input
									className="flex h-9 w-full rounded-md border border-border bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground"
									id={`env-${key}`}
									onChange={(e) => {
										handleChange(key, e.target.value);
									}}
									placeholder={placeholder}
									type={showTokens[key] ? 'text' : 'password'}
									value={envVars[key] ?? ''}
								/>
								<button
									className="absolute right-2 flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
									onClick={() => toggleShowToken(key)}
									type="button"
								>
									{showTokens[key] ? (
										<EyeOff className="size-3.5" />
									) : (
										<Eye className="size-3.5" />
									)}
								</button>
							</div>
							<span className="text-xs text-muted-foreground">{description}</span>
						</div>
					))}
				</div>
			</SettingsCard>

			{error && (
				<div className="rounded-[12px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<div className="flex items-center gap-3">
				<Button
					className="gap-1.5"
					disabled={!isDirty || isSaving}
					onClick={() => {
						void handleSave();
					}}
				>
					<Save className="size-4" />
					{isSaving ? 'Saving…' : 'Save'}
				</Button>
				<Button
					className="gap-1.5"
					disabled={!isDirty || isSaving}
					onClick={() => {
						void handleDiscard();
					}}
					variant="outline"
				>
					<RotateCcw className="size-4" />
					Discard
				</Button>
			</div>
		</SettingsPage>
	);
}
