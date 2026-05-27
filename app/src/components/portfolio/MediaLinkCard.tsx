import { useState } from 'react';
import Card from '../ui/Card';

interface MediaLinkCardProps {
  url: string;
  onRemove?: () => void;
}

type LinkType = 'youtube' | 'vimeo' | 'drive' | 'other';

function detectLinkType(url: string): LinkType {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  if (/drive\.google\.com/i.test(url)) return 'drive';
  return 'other';
}

function getIcon(linkType: LinkType): string {
  switch (linkType) {
    case 'youtube': return '▶';
    case 'vimeo': return '◉';
    case 'drive': return '▤';
    case 'other': return '🔗';
  }
}

function getLabel(linkType: LinkType): string {
  switch (linkType) {
    case 'youtube': return 'YouTube';
    case 'vimeo': return 'Vimeo';
    case 'drive': return 'Google Drive';
    case 'other': return 'Link';
  }
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

export default function MediaLinkCard({ url, onRemove }: MediaLinkCardProps) {
  const [hovered, setHovered] = useState(false);
  const linkType = detectLinkType(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card padding="small" variant="darker" className="hover:border-gray-600 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-lg shrink-0">
            {getIcon(linkType)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-300 truncate">{getLabel(linkType)}</p>
            <p className="text-[10px] text-gray-600 truncate">{getDomain(url)}</p>
          </div>
          {onRemove && hovered && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
              className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs hover:bg-red-500/40 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </Card>
    </a>
  );
}
