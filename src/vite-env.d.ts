/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Proteus PDF converter base URL. Unset disables the PDF feature entirely. */
  readonly VITE_CONVERT_API_URL?: string;
  readonly VITE_IMAGE_FIELDS?: string;
  /** Experiment: Done screen variant B. 'true' turns it on; anything else is off. */
  readonly VITE_EXP_ASK_INLINE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
