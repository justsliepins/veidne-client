/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Proteus PDF converter base URL. Unset disables the PDF feature entirely. */
  readonly VITE_CONVERT_API_URL?: string;
  readonly VITE_IMAGE_FIELDS?: string;
  /** '1' under the Playwright web servers: random behaviour becomes deterministic. */
  readonly VITE_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
