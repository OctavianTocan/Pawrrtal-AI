/**
 * Sample 2026 model preset.
 *
 * @fileoverview Ready-to-use {@link ChatModelOption} list mirroring the
 * pawrrtal lineup. Consumers can import it directly when they don't have
 * their own catalogue yet, or use it as a template to author their own.
 */

import type { ChatModelOption } from '../types/index.js';

/** Sample model list — 7 entries spanning Anthropic, OpenAI, and Google. */
export const CHAT_MODELS_2026: ChatModelOption[] = [
	{
		id: 'claude-opus-4-7',
		shortName: 'Claude Opus 4.7',
		name: 'Claude Opus 4.7',
		provider: 'anthropic',
		description: 'Most capable for ambitious work',
	},
	{
		id: 'claude-sonnet-4-6',
		shortName: 'Claude Sonnet 4.6',
		name: 'Claude Sonnet 4.6',
		provider: 'anthropic',
		description: 'Balanced for everyday tasks',
	},
	{
		id: 'claude-haiku-4-5',
		shortName: 'Claude Haiku 4.5',
		name: 'Claude Haiku 4.5',
		provider: 'anthropic',
		description: 'Fastest for quick answers',
	},
	{
		id: 'gpt-5.5',
		shortName: 'GPT-5.5',
		name: 'GPT-5.5',
		provider: 'openai',
		description: "OpenAI's flagship reasoning",
	},
	{
		id: 'gpt-5.4',
		shortName: 'GPT-5.4',
		name: 'GPT-5.4',
		provider: 'openai',
		description: 'Faster GPT for everyday tasks',
	},
	{
		id: 'gemini-3-flash-preview',
		shortName: 'Gemini 3 Flash',
		name: 'Gemini 3 Flash Preview',
		provider: 'google',
		description: "Google's frontier multimodal",
	},
	{
		id: 'gemini-3.1-flash-lite-preview',
		shortName: 'Gemini Flash Lite',
		name: 'Gemini 3.1 Flash Lite Preview',
		provider: 'google',
		description: 'Light and fast Gemini',
	},
];
