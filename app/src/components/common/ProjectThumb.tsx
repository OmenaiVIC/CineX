import { useRef, useState } from 'react';
import { uploadToDataUrl, thumbnailFromUrl } from '../../lib/thumbnails';
import Button from '../ui/Button';

// ---------------------------------------------------------------------------
// ProjectThumb + ImagePicker — ported from cinex-canvas/src/components/cinex/ProjectThumb.tsx
// Adapted to the app SPA: no lucide (inline SVGs), no cn() helper, app color tokens.
//
// Usage:
//   <ProjectThumb src={mediaUrl} alt={title} tone="from-[#1a1a2e] to-[#0a0a0f]" className="h-36 w-full rounded-lg" />
//
// tone = the Tailwind `from-... to-...` gradient stops used for the fallback cover.
// When `src` is a YouTube/Vimeo link it resolves to the provider thumbnail.
// ---------------------------------------------------------------------------

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="M2.5 8.5h19M9 4v4.5M15 4v4.5M9 12.5v4M15 12.5v4M9 20v-3.5M15 20v-3.5" />
    </svg>
  );
}

export interface ProjectThumbProps {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: string;
  tone?: string;
}

export function ProjectThumb({ src, alt = '', className = '', rounded = 'rounded-2xl', tone = 'from-[#1a1a2e] to-[#0a0a0f]' }: ProjectThumbProps) {
  const resolved = thumbnailFromUrl(src);
  const [error, setError] = useState(false);

  if (!resolved || error) {
    return (
      <div className={`flex items-center justify-center bg-linear-to-br ${tone} text-gray-500 ${rounded} ${className}`}>
        <FilmIcon />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}

function ImagePlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M3 15.5l4-3 3 2.5 3.5-3.5L20 16" />
      <path d="M17.5 3v5M15 5.5h5" />
    </svg>
  );
}

export interface ImagePickerProps {
  value?: string;
  onChange?: (url: string) => void;
  className?: string;
  label?: string;
  help?: string;
  cover?: string;
}

export function ImagePicker({
  value,
  onChange,
  className = '',
  label = 'Thumbnail',
  help = 'Upload a PNG/JPG/WEBP, or paste a YouTube/Vimeo/image URL.',
  cover = 'from-[#1a1a2e] to-[#0a0a0f]',
}: ImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState('');

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await uploadToDataUrl(f);
      onChange?.(dataUrl);
      setDraftUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const commitUrl = () => {
    const v = draftUrl.trim();
    if (!v) return;
    onChange?.(v);
    setDraftUrl('');
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white">{label}</span>
        {(value || draftUrl.trim()) && (
          <button type="button" className="text-xs text-gray-400 hover:text-red-400" onClick={() => onChange?.('')}>
            Remove
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-4">
        <div className="relative shrink-0">
          <ProjectThumb src={value} alt="Cover preview" tone={cover} className="h-24 w-36" />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0a0a0f]/70 text-xs text-gray-300">
              Reading…
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="ghost"
            size="small"
            className="!px-3 !py-2 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <span className="inline-flex items-center gap-2">
              <ImagePlusIcon /> Upload image
            </span>
          </Button>

          <input
            type="url"
            placeholder="Paste a YouTube / Vimeo / image link"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitUrl();
              }
            }}
            className="w-full rounded-xl border border-[#1a1a2e] bg-[#0a0a0f] px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none transition-colors focus:border-[#4ade80]/50"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {help && !error && <p className="mt-2 text-xs text-gray-500">{help}</p>}
    </div>
  );
}

export default ProjectThumb;
