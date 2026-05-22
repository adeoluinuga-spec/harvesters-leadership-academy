"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/client";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (url: string) => void;
  className?: string;
};

export function ThumbnailUpload({ value, onChange, className }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("course-thumbnails")
        .upload(path, file, { upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleRemove() {
    onChange("");
    setError(null);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          <img
            src={value}
            alt="Course thumbnail"
            className="aspect-video w-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-colors hover:border-zinc-300 hover:bg-zinc-100",
            uploading && "cursor-not-allowed opacity-60"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-zinc-400" />
              <p className="text-xs text-zinc-500">Uploading...</p>
            </>
          ) : (
            <>
              <ImagePlus className="size-6 text-zinc-400" />
              <p className="text-sm font-medium text-zinc-600">Upload thumbnail</p>
              <p className="text-xs text-zinc-400">Drag & drop or click · JPG, PNG, WebP up to 10MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
      />

      {!value && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">or paste URL</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
      )}

      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
