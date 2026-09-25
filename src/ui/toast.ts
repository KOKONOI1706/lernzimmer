import { create } from 'zustand';

/** One short status message at a time, shown in the taskbar. */
export const useToast = create<{ text?: string; show: (text: string, ms?: number) => void }>()((set) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    text: undefined,
    show: (text, ms = 2200) => {
      clearTimeout(timer);
      set({ text });
      timer = setTimeout(() => set({ text: undefined }), ms);
    },
  };
});
