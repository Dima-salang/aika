"use client";

import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download, ExternalLink, FileText } from "lucide-react";
import { useImageViewer } from "@/utils/image-viewer-store";
import { renderMarkdown } from "@/utils/markdown";

export function ImageViewer() {
  const { isOpen, images, currentIndex, close, next, prev } = useImageViewer();
  const [isOverlayMinimized, setIsOverlayMinimized] = React.useState(false);

  useEffect(() => {
    setIsOverlayMinimized(false);
  }, [currentIndex, isOpen]);

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
  const currentImageUrl = currentImage?.url || "";
  const isImg = !currentImage.mimeType || currentImage.mimeType.startsWith("image/") || !!currentImageUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i);

  const handleDownload = async () => {
    if (!currentImageUrl) return;
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const urlParts = currentImageUrl.split("/");
      const fileName = currentImage.fileName || urlParts[urlParts.length - 1].split("?")[0] || "evidence.png";
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(currentImageUrl, "_blank");
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
          FILE {currentIndex + 1} OF {images.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700/80 text-zinc-300 hover:text-white transition-all shadow-lg cursor-pointer"
            title="Download File"
          >
            <Download className="h-4 w-4" />
          </button>
          <a
            href={currentImageUrl}
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

      {/* Main Image/File Container */}
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

        {/* Display Wrapper */}
        {isImg ? (
          <div className="relative h-full w-full flex items-center justify-center select-none">
            <img
              src={currentImageUrl}
              alt={`evidence-${currentIndex}`}
              className="max-h-full max-w-full object-contain rounded shadow-2xl border border-zinc-900 animate-in zoom-in-95 duration-250 select-none pointer-events-none"
            />
          </div>
        ) : (
          <div className="relative h-full w-full flex items-center justify-center select-none p-6">
            <div className="bg-zinc-900 border border-zinc-800/50 p-8 rounded-2xl max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <FileText className="h-16 w-16 text-primary animate-pulse" />
              <div className="space-y-1">
                <h5 className="text-zinc-200 text-sm font-bold truncate max-w-[280px]">
                  {currentImage?.fileName || "Attached File"}
                </h5>
                {currentImage?.mimeType && (
                  <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase font-semibold">
                    {currentImage.mimeType}
                  </span>
                )}
              </div>
              <button
                onClick={handleDownload}
                className="w-full mt-2 rounded-xl text-xs px-4 py-2.5 font-bold bg-primary hover:bg-primary/90 text-on-primary transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Download className="h-3.5 w-3.5" />
                Download Attachment
              </button>
            </div>
          </div>
        )}

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

      {/* Bottom-left Time Log Link Overlay (Facebook-Style) */}
      {currentImage && (currentImage.title || currentImage.description) && (
        <div 
          className="absolute bottom-6 left-6 max-w-[90%] sm:max-w-md p-4 rounded-2xl bg-black/75 border border-zinc-800/50 backdrop-blur-md text-white shadow-2xl z-20 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4">
            {currentImage.title ? (
              <div className="text-sm font-extrabold tracking-tight text-zinc-100 flex items-center gap-1.5 [&_p]:m-0 [&_a]:text-primary hover:[&_a]:underline">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">schedule</span>
                {renderMarkdown(currentImage.title)}
              </div>
            ) : (
              <div className="text-sm font-extrabold tracking-tight text-zinc-400">Linked Time Log</div>
            )}
            {currentImage.description && (
              <button
                onClick={() => setIsOverlayMinimized(!isOverlayMinimized)}
                className="text-[10px] text-primary hover:text-primary-hover hover:underline font-bold shrink-0 cursor-pointer flex items-center gap-0.5"
              >
                {isOverlayMinimized ? "Expand" : "Minimize"}
              </button>
            )}
          </div>
          <div 
            className={`grid transition-all duration-300 ease-in-out ${
              isOverlayMinimized ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100 mt-1.5"
            }`}
          >
            <div className="overflow-hidden">
              {currentImage.description && (
                <div className="text-[11px] text-zinc-300 leading-relaxed font-medium [&_p]:m-0 [&_a]:text-primary hover:[&_a]:underline">
                  {renderMarkdown(currentImage.description)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Page Navigation Indicator */}
      {images.length > 1 && (
        <div 
          className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-lg"
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
