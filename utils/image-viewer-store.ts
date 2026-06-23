import { create } from "zustand";

export interface ImageViewerImage {
  url: string;
  title?: string;
  description?: string;
  mimeType?: string;
  fileName?: string;
}

interface ImageViewerState {
  isOpen: boolean;
  images: ImageViewerImage[];
  currentIndex: number;
  open: (images: (string | ImageViewerImage)[], index?: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useImageViewer = create<ImageViewerState>((set) => ({
  isOpen: false,
  images: [],
  currentIndex: 0,
  open: (images, index = 0) => {
    const formattedImages = images.map((img) =>
      typeof img === "string" ? { url: img } : img
    );
    set({ isOpen: true, images: formattedImages, currentIndex: index });
  },
  close: () => set({ isOpen: false, images: [], currentIndex: 0 }),
  next: () => set((state) => ({
    currentIndex: state.images.length > 0 ? (state.currentIndex + 1) % state.images.length : 0,
  })),
  prev: () => set((state) => ({
    currentIndex: state.images.length > 0 ? (state.currentIndex - 1 + state.images.length) % state.images.length : 0,
  })),
}));
