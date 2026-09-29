import { create } from 'zustand';

export type NotebookTab = 'notes' | 'ai' | 'gpt';

interface NotebookState {
  notebookWidth: string;
  isNotebookVisible: boolean;
  isNotebookPinned: boolean;
  notebookActiveTab: NotebookTab;
  getIsNotebookVisible: () => boolean;
  toggleNotebook: () => void;
  toggleNotebookPin: () => void;
  getNotebookWidth: () => string;
  setNotebookWidth: (width: string) => void;
  setNotebookVisible: (visible: boolean) => void;
  setNotebookPin: (pinned: boolean) => void;
  setNotebookActiveTab: (tab: NotebookTab) => void;
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebookWidth: '',
  isNotebookVisible: false,
  isNotebookPinned: false,
  notebookActiveTab: 'notes',
  getIsNotebookVisible: () => get().isNotebookVisible,
  getNotebookWidth: () => get().notebookWidth,
  setNotebookWidth: (width: string) => set({ notebookWidth: width }),
  toggleNotebook: () => set((state) => ({ isNotebookVisible: !state.isNotebookVisible })),
  toggleNotebookPin: () => set((state) => ({ isNotebookPinned: !state.isNotebookPinned })),
  setNotebookVisible: (visible: boolean) => set({ isNotebookVisible: visible }),
  setNotebookPin: (pinned: boolean) => set({ isNotebookPinned: pinned }),
  setNotebookActiveTab: (tab: NotebookTab) => set({ notebookActiveTab: tab }),
}));
