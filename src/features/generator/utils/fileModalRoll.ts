declare global {
  interface Window {
    /** Test seam. A spec sets window.__veidneTest.fileModalRoll to 'win' or
     *  'lose' (via addInitScript) to make the single-file modal roll
     *  deterministic. Under the E2E dev servers with nothing set, it loses. */
    __veidneTest?: { fileModalRoll?: 'win' | 'lose' };
  }
}

/** Whether one single-file download opens the donation modal. Random in
 *  normal use; deterministic under test so no spec is flaky one run in ten.
 *  The test default is a build-time flag the Playwright web servers set
 *  (VITE_E2E), never a browser property: navigator.webdriver is also true in
 *  any Chrome started with automation or remote-debugging flags, which would
 *  silently make every real roll lose. */
export function rollFileModal(chance: number): boolean {
  const forced = window.__veidneTest?.fileModalRoll;
  if (forced) return forced === 'win';
  if (import.meta.env.VITE_E2E === '1') return false;
  return Math.random() < chance;
}
