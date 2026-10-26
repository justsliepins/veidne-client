import { create } from 'zustand';
import { getTemplates, type TemplateItem } from '@/services/templateService';

interface TemplateStoreState {
  isOpen: boolean; templates: TemplateItem[]; isLoading: boolean; searchQuery: string;
  openLibrary: () => Promise<void>;
  closeLibrary: () => void;
  fetchTemplates: () => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useTemplateStore = create<TemplateStoreState>((set, get) => ({
  isOpen: false, templates: [], isLoading: false, searchQuery: '',

  openLibrary: async () => {
    set({ isOpen: true, searchQuery: '' });
    if (get().templates.length === 0) await get().fetchTemplates();
  },

  closeLibrary: () => set({ isOpen: false, searchQuery: '' }),

  fetchTemplates: async () => {
    set({ isLoading: true });
    try {
      const templates = await getTemplates();
      set({ templates, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
