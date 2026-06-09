"use client";

import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { useImageViewer } from "@/utils/image-viewer-store";

export function ImageViewer() {
  const { isOpen, images, currentIndex, close, next, prev } = useImageViewer();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Disable scrolling when viewer is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close, next, prev]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract file name from URL if possible, otherwise default to "evidence"
      const urlParts = currentImage.split("/");
      const fileName = urlParts[urlParts.length - 1].split("?")[0] || "evidence.png";
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(currentImage, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={close}
    >
      {/* Top Bar Controls */}
      <div 
        className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-zinc-400 text-xs font-mono font-medium tracking-wide">
          IMAGE {currentIndex + 1} OF {images.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700/80 text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
            title="Download Image"
          >
            <Download className="h-4 w-4" />
          </button>
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700/80 text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
            title="Open Original"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={close}
            className="p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700/80 text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div 
        className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Arrow */}
        {images.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-4 p-4 rounded-full bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/40 hover:border-zinc-700/80 text-zinc-400 hover:text-white transition-all shadow-2xl cursor-pointer hover:scale-105 active:scale-95 z-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Image Display */}
        <div className="relative h-full w-full flex items-center justify-center select-none">
          <img
            src={currentImage}
            alt={`evidence-${currentIndex}`}
            className="max-h-full max-w-full object-contain rounded shadow-2xl border border-zinc-900 animate-in zoom-in-95 duration-250 select-none pointer-events-none"
          />
        </div>

        {/* Right Arrow */}
        {images.length > 1 && (
          <button
            onClick={next}
            className="absolute right-4 p-4 rounded-full bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/40 hover:border-zinc-700/80 text-zinc-400 hover:text-white transition-all shadow-2xl cursor-pointer hover:scale-105 active:scale-95 z-20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom Page Navigation Indicator (pills to click/switch slides directly) */}
      {images.length > 1 && (
        <div 
          className="absolute bottom-6 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => useImageViewer.setState({ currentIndex: idx })}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex 
                  ? "w-6 bg-primary" 
                  : "w-2.5 bg-zinc-600 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
