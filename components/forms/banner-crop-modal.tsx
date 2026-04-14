"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { ArrowLeft } from "lucide-react";

type BannerCropModalProps = {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onClose: () => void;
  aspect?: number;
  title?: string;
};

export function BannerCropModal({
  imageSrc,
  onCropComplete,
  onClose,
  aspect = 3 / 1,
  title = "Crop Image",
}: BannerCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = useCallback((_: unknown, croppedArea: Area) => {
    setCroppedAreaPixels(croppedArea);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;

    const canvas = document.createElement("canvas");
    const image = new Image();
    image.crossOrigin = "anonymous";

    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.src = imageSrc;
    });

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    onCropComplete(croppedDataUrl);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-[600px] rounded-2xl border border-white/10 bg-[#0d0d1a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[15px] font-bold text-white">{title}</span>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-full bg-white px-4 py-1.5 text-[14px] font-bold text-black transition hover:bg-white/90"
          >
            Apply
          </button>
        </div>

        {/* Crop area */}
        <div className="relative h-[350px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
            showGrid={false}
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: { border: "2px solid #1d9bf0" },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-6 py-4">
          <ZoomOut className="size-4 text-copy-muted" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-accent-secondary"
          />
          <ZoomIn className="size-4 text-copy-muted" />
        </div>
      </div>
    </div>
  );
}

function ZoomOut({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomIn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
