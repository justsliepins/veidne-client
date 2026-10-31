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

  // Experiments (the "test first" items of the November 2026 audits). Each is off
  // unless the build sets its variable to 'true'. Production builds set none of
  // them (the Dockerfile passes only VITE_CONVERT_API_URL and VITE_IMAGE_FIELDS),
  // so production always runs the default. With every flag off, the prerendered
  // HTML is identical to a build without these lines.
  // Done screen, variant B: no dialog after the first download; the donation
  // card moves up under the saved notice instead.
  expAskInline: import.meta.env.VITE_EXP_ASK_INLINE === 'true',
  // Homepage: the "What people make with Veidne" section with four cards.
  expHomeUses: import.meta.env.VITE_EXP_HOME_USES === 'true',
  // Homepage: the "Questions before you start" section.
  expHomeFaq: import.meta.env.VITE_EXP_HOME_FAQ === 'true',
  // Hero: the open-source line under the buttons.
  expHomeOpenSource: import.meta.env.VITE_EXP_HOME_OPEN_SOURCE === 'true',
} as const;
