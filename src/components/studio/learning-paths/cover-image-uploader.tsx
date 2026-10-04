"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  ImageIcon,
  X,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Check,
  Search,
  FolderOpen,
} from "lucide-react";
import { ActionButton, StudioInput, StudioLabel } from "@/components/studio/ui";
import { cn } from "@/lib/utils";

type MediaAsset = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  folder?: string;
  assetType?: string;
};

interface CoverImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export function CoverImageUploader({ value, onChange }: CoverImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [imgLoadError, setImgLoadError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current value looks like a local file path
  const isLocalPath = /^[a-zA-Z]:\\|^file:\/\/|^\/Users\/|^\/home\//.test(value?.trim() || "");

  // Load media library assets when modal opens
  useEffect(() => {
    if (!showMediaModal) return;
    setLoadingMedia(true);
    fetch("/api/studio/media?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.assets)) {
          setMediaAssets(data.assets);
        }
      })
      .catch((err) => {
        console.error("Failed to load media assets:", err);
      })
      .finally(() => setLoadingMedia(false));
  }, [showMediaModal]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP, SVG, GIF).");
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be under 10MB.");
      return;
    }

    setUploading(true);
    setError("");
    setImgLoadError(false);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "learning-paths");
      formData.set("altText", "Learning Path Cover Image");

      const res = await fetch("/api/studio/media", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const uploadedUrl = data.asset?.url || data.asset?.secure_url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
      } else {
        throw new Error("No URL returned from upload");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const filteredAssets = mediaAssets.filter((a) =>
    a.fileName?.toLowerCase().includes(mediaSearch.toLowerCase()) ||
    a.folder?.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      <div className="flex items-center justify-between">
        <StudioLabel>Cover Image</StudioLabel>
        <div className="flex items-center gap-2">
          <ActionButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload size={13} /> Browse & Upload
              </>
            )}
          </ActionButton>

          <ActionButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMediaModal(true)}
          >
            <ImageIcon size={13} /> Media Library
          </ActionButton>
        </div>
      </div>

      {/* URL Input */}
      <div className="flex gap-2">
        <StudioInput
          placeholder="Paste public image URL (https://res.cloudinary.com/...)"
          value={value}
          onChange={(e) => {
            setError("");
            setImgLoadError(false);
            onChange(e.target.value);
          }}
          className={cn(isLocalPath && "border-amber-500/50 focus:border-amber-500")}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setImgLoadError(false);
            }}
            className="px-3 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-300 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-colors text-xs flex items-center gap-1"
            title="Clear image"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Local path warning box */}
      {isLocalPath && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs leading-relaxed">
          <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              Local file path detected ({value.slice(0, 35)}...)
            </p>
            <p className="text-amber-200/80">
              Web browsers cannot load files directly from your computer disk (<code>C:\Users\...</code>) for security reasons.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium text-[11px] border border-amber-500/40 transition-colors"
              >
                <Upload size={12} /> Click here to Browse & Upload this image to Cloudinary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Banner */}
      {value && !isLocalPath && (
        <div className="relative rounded-xl border border-purple-500/20 bg-purple-950/20 overflow-hidden group">
          <div className="relative aspect-[21/9] w-full max-h-48 overflow-hidden bg-black/40 flex items-center justify-center">
            {!imgLoadError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Cover preview"
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                onError={() => setImgLoadError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground text-xs text-center">
                <AlertTriangle size={24} className="text-amber-400" />
                <span>Could not load image preview. Please check the URL.</span>
              </div>
            )}

            {/* Overlay buttons */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-md bg-black/70 hover:bg-black text-white text-xs border border-white/10 transition-colors flex items-center gap-1"
                title="Open in new tab"
              >
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => onChange("")}
                className="p-1.5 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs border border-rose-500/30 transition-colors"
                title="Remove cover image"
              >
                <X size={12} />
              </button>
            </div>

            <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-purple-200 border border-white/10 flex items-center gap-1">
              <Check size={10} className="text-emerald-400" />
              Cover image active
            </div>
          </div>
        </div>
      )}

      {/* Media Library Selector Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-purple-500/30 bg-[#0c0915] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20 bg-purple-950/30">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-purple-400" />
                <h3 className="text-base font-semibold text-white">Select from Media Library</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-500/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search & Filter */}
            <div className="p-3 border-b border-purple-500/10 bg-purple-950/10 flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                <StudioInput
                  placeholder="Search assets by file name or folder..."
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  className="pl-8 text-xs py-1.5"
                />
              </div>
              <ActionButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={12} /> Upload New
              </ActionButton>
            </div>

            {/* Modal Asset Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMedia ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-purple-300/60 text-xs">
                  <Loader2 size={24} className="animate-spin text-purple-400" />
                  <span>Loading assets from Cloudinary...</span>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                  <ImageIcon size={32} className="mx-auto text-purple-400/40" />
                  <p>No media assets found.</p>
                  <p className="text-[11px] text-purple-300/60">
                    Click &ldquo;Upload New&rdquo; to add your first image to the library.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredAssets.map((asset) => {
                    const isSelected = value === asset.url;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          onChange(asset.url);
                          setShowMediaModal(false);
                        }}
                        className={cn(
                          "group relative aspect-video rounded-lg border overflow-hidden cursor-pointer transition-all bg-black/40",
                          isSelected
                            ? "border-purple-500 ring-2 ring-purple-500/40"
                            : "border-purple-500/15 hover:border-purple-500/40 hover:scale-[1.02]"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.fileName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                          <p className="text-[11px] font-medium text-white truncate">{asset.fileName}</p>
                          <span className="text-[9px] text-purple-300/80">{asset.folder || "general"}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 rounded-full bg-purple-600 p-0.5 text-white shadow">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-purple-500/20 bg-purple-950/20 flex justify-end gap-2">
              <ActionButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMediaModal(false)}
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
