/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BACKEND_URL: string | undefined;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
