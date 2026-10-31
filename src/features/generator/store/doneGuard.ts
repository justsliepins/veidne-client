import { create } from 'zustand';

// While a real run on the Done screen has documents that were never
// downloaded, leaving inside the app (the browser's Back button, the header
// logo) asks first, the same way closing the tab does. DoneView sets the
// question; the editor's router blocker reads it at navigation time. The
// screen's own "Discard" paths clear it before they move on, because they
// have asked already.
interface DoneGuardState {
  /** The confirmation text while protection is on, null otherwise. */
  message: string | null;
  setMessage: (message: string | null) => void;
}

export const useDoneGuard = create<DoneGuardState>((set) => ({
  message: null,
  setMessage: (message) => set({ message }),
}));
