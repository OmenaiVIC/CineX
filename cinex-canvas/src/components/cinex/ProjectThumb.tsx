import { useRef, useState } from "react";
import { Film, ImagePlus } from "lucide-react";
import { uploadToDataUrl } from "@/lib/thumbnails";
import { Button } from "@/components/ui/button";
import { ProjectThumb } from "@/components/cinex/ProjectThumb";

export function ProjectThumb({
  src,
  alt,
  tone,
  className,
  rounded,
}: {
  src?: string | null;
  alt: string;
  tone: string;
  className?: string;
  rounded?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-linear-to-br ${tone} ${rounded ?? ""} ${className ?? ""}`}
      >
        <Film className="h-6 w-6 text-primary/40" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={`object-cover ${rounded ?? ""} ${className ?? ""}`}
    />
  );
}

export function ImagePicker({
  value,
  onChange,
  label,
  help,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  help?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value.startsWith("data:") ? "" : value);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await uploadToDataUrl(file);
      onChange(dataUrl);
    } catch {
      // keep the previous value; the input itself enforces image types
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyUrl = (v: string) => {
    setUrlDraft(v);
    onChange(v);
  };

  const clear = () => {
    setUrlDraft("");
    onChange("");
  };

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      {value ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <ProjectThumb
            src={value}
            alt="Preview"
            tone="from-surface-2 to-surface-1"
            className="h-40 w-full"
          />
          <div className="flex flex-wrap gap-2 border-t border-border bg-surface-2 p-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full text-destructive"
              onClick={clear}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/60 p-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
        >
          <ImagePlus className="h-6 w-6" aria-hidden />
          <span className="text-sm">{busy ? "Preparing image…" : "Upload a project image (PNG, JPG or WEBP)"}</span>
        </button>
      )}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Or paste a YouTube, Vimeo or image URL:</p>
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => applyUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="flex h-10 w-full rounded-2xl border border-border bg-surface-2 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
