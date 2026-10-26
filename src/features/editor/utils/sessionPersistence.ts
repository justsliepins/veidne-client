const KEY = 'veidne_session';
let timer: ReturnType<typeof setTimeout> | null = null;
export interface SavedSession {
  sourceFileName: string; documentHtml: string; rawDocxBase64: string;
  placeholders: unknown[];
  editorPhase: string; dataSubState: string; kitDownloaded: boolean; savedAt: number;
}
export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
export function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
export function saveSession(data: SavedSession): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(KEY, json.length > 4_194_304 ? JSON.stringify({ ...data, rawDocxBase64: '' }) : json);
    } catch { /* quota exceeded */ }
  }, 300);
}
export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSession;
    return data.sourceFileName && Array.isArray(data.placeholders) ? data : null;
  } catch { return null; }
}
export function clearSession(): void { if (timer) { clearTimeout(timer); timer = null; } localStorage.removeItem(KEY); }
export function hasSession(): boolean { try { return localStorage.getItem(KEY) !== null; } catch { return false; } }
