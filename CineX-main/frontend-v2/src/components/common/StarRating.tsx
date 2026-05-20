import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

export default function StarRating({ rating, maxStars = 5, interactive = false, onChange, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = interactive && hovered > 0 ? hovered : rating;
  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    stars.push(
      <button
        key={i}
        type="button"
        disabled={!interactive}
        onMouseEnter={() => interactive && setHovered(i)}
        onMouseLeave={() => interactive && setHovered(0)}
        onClick={() => interactive && onChange?.(i)}
        className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-colors focus:outline-none ${
          i <= display ? 'text-yellow-400' : 'text-gray-600'
        } ${sizeMap[size]}`}
        aria-label={`${i} star${i > 1 ? 's' : ''}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={sizeMap[size]}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </button>
    );
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}
