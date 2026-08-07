// ---------------------------------------------------------------------------
// Project thumbnail resolution.
// Mirrors the contract-mandated "every project carries a visual" rule:
//  - PNG/JPG/WEBP file upload -> stored as a data URL on the campaign/portfolio
//  - YouTube / Vimeo links -> provider thumbnail extracted automatically
//  - MP4 or unknown media -> null (component falls back to the cover gradient)
// ---------------------------------------------------------------------------

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

export function thumbnailFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const yt = youtubeId(trimmed);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;

  const vm = vimeoId(trimmed);
  if (vm) return `https://vumbnail.com/${vm}.jpg`;

  if (/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(trimmed)) return trimmed;

  return null;
}

export function thumbnailForCampaign(c: { mediaUrl?: string }): string | null {
  return thumbnailFromUrl(c.mediaUrl);
}

// Reads an uploaded image, downscales it (so it survives localStorage), and
// returns a data URL. Falls back to the raw data URL if canvas is unavailable.
export function uploadToDataUrl(file: File, maxDim = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : null;
      if (!raw) return reject(new Error("Could not read file"));

      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        if (scale >= 1) return resolve(raw);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(raw);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const encoded = canvas.toDataURL("image/webp", 0.78);
        resolve(encoded);
      };
      img.onerror = () => reject(new Error("Not a readable image"));
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
