// Type augmentation for Vite-style import.meta.glob (used by vendored Craft code)
interface ImportMeta {
  glob(pattern: string, options?: { eager?: boolean; import?: string }): Record<string, unknown>
}
