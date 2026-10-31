import { create } from 'zustand';
import { getTemplates, type TemplateItem } from '@/services/templateService';

/** idle: never fetched. loading: request in flight (at most TEMPLATE_API_TIMEOUT_MS
 *  before the built-in list is used). ready: `templates` holds the list, which can
 *  be empty. error: no list could be produced at all. */
export type TemplateListStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TemplateStoreState {
  isOpen: boolean; templates: TemplateItem[]; status: TemplateListStatus; searchQuery: string;
  openLibrary: () => Promise<void>;
  closeLibrary: () => void;
  fetchTemplates: () => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useTemplateStore = create<TemplateStoreState>((set, get) => ({
  isOpen: false, templates: [], status: 'idle', searchQuery: '',

  openLibrary: async () => {
    set({ isOpen: true, searchQuery: '' });
    const { templates, status } = get();
    if (templates.length === 0 && status !== 'loading') await get().fetchTemplates();
  },

  closeLibrary: () => set({ isOpen: false, searchQuery: '' }),

  fetchTemplates: async () => {
    set({ status: 'loading' });
    try {
      const templates = await getTemplates();
      set({ templates, status: 'ready' });
    } catch {
      set({ status: 'error' });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
