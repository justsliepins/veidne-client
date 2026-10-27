/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Proteus PDF converter base URL. Unset disables the PDF feature entirely. */
  readonly VITE_CONVERT_API_URL?: string;
  readonly VITE_IMAGE_FIELDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
