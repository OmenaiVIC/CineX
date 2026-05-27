import type { JSX } from 'react';

type SkeletonVariant = 'card' | 'row' | 'modal-content' | 'avatar' | 'text';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
}

const baseClass = 'animate-pulse bg-gray-800 rounded';

function SkeletonCard() {
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className={`${baseClass} h-4 w-3/4`} />
      <div className={`${baseClass} h-3 w-full`} />
      <div className={`${baseClass} h-3 w-5/6`} />
      <div className="flex justify-between items-center pt-2">
        <div className={`${baseClass} h-8 w-20 rounded-lg`} />
        <div className={`${baseClass} h-4 w-16`} />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <div className={`${baseClass} h-4 w-2/5`} />
        <div className={`${baseClass} h-3 w-3/5`} />
      </div>
      <div className={`${baseClass} h-5 w-16 rounded ml-3 flex-shrink-0`} />
    </div>
  );
}

function SkeletonModalContent() {
  return (
    <div className="space-y-4 p-4">
      <div className={`${baseClass} h-6 w-1/3 mx-auto`} />
      <div className={`${baseClass} h-32 w-full rounded-xl`} />
      <div className="space-y-2">
        <div className={`${baseClass} h-3 w-full`} />
        <div className={`${baseClass} h-3 w-4/5`} />
        <div className={`${baseClass} h-3 w-3/5`} />
      </div>
      <div className="flex justify-center pt-2">
        <div className={`${baseClass} h-10 w-32 rounded-lg`} />
      </div>
    </div>
  );
}

function SkeletonAvatar() {
  return (
    <div className="flex items-center gap-3">
      <div className={`${baseClass} h-10 w-10 rounded-full flex-shrink-0`} />
      <div className="space-y-1.5 flex-1">
        <div className={`${baseClass} h-3 w-2/5`} />
        <div className={`${baseClass} h-2.5 w-3/5`} />
      </div>
    </div>
  );
}

function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`${baseClass} h-3 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

const variants: Record<SkeletonVariant, (props?: any) => JSX.Element> = {
  card: SkeletonCard,
  row: SkeletonRow,
  'modal-content': SkeletonModalContent,
  avatar: SkeletonAvatar,
  text: (p) => <SkeletonText {...p} />,
};

export default function LoadingSkeleton({ variant = 'card', count = 1, className = '' }: LoadingSkeletonProps) {
  const Component = variants[variant] || variants.card;
  return (
    <div className={className} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => <Component key={i} />)}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
