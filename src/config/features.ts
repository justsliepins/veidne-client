export const features = {
  // MVP
  editor: true,
  templateLibrary: true,
  excelParser: true,
  generator: true,
  roadmapVoting: true,
  suggestions: true,
  donation: true,
  demo: true,
  analytics: true,
  kitDownload: true,

  // Phase 2
  pdfExport: false,
  // Dark-launched like the PDF feature: the dev server with .env.development
  // (5173) has it on, the darklaunch server (5181) and production builds have
  // it off until VITE_IMAGE_FIELDS=true ships in .env.production. With the
  // flag off the app's behavior and output are unchanged: the parser emits no
  // image tokens, so nothing renders, nothing is clickable, and no image
  // field can exist.
  imagePlaceholders: import.meta.env.VITE_IMAGE_FIELDS === 'true',
  conditionalLogic: false,
  userAccounts: false,
  templateMarketplace: false,
} as const;
