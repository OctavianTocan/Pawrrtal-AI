declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const workerSrc: string;
  export default workerSrc;
}

declare module "tiptap-markdown" {
  export const Markdown: {
    configure(options?: Record<string, unknown>): import("@tiptap/core").AnyExtension;
  };
}

declare module "@mariozechner/pi-ai" {
  export type KnownProvider = string;
  export type Api = string;
  export interface Model<T = unknown> {
    id: string;
    name?: string;
    displayName?: string;
    baseUrl?: string;
    contextWindow?: number;
    maxOutputTokens?: number;
    supportsPromptCache?: boolean;
    supportsReasoning?: boolean;
    metadata?: T;
  }

  export function getProviders(): KnownProvider[];
  export function getModels(provider: KnownProvider | Api): Model[];
}

declare module "@anthropic-ai/claude-agent-sdk" {
  export interface Options {
    [key: string]: unknown;
  }

  export interface PermissionModeOptions {
    mode?: string;
  }

  export interface QueryOptions {
    permissionMode?: PermissionModeOptions;
    cwd?: string;
  }

  export interface ToolResult {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  }

  export function tool(...args: unknown[]): unknown;
  export function createSdkMcpServer(...args: unknown[]): unknown;
  export function query(...args: unknown[]): AsyncIterable<unknown>;
}
