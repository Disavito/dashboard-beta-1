import React from 'react';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  variant?: 'table' | 'cards' | 'stats';
  rows?: number;
}

const Pulse: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("shimmer rounded-lg", className)} {...props} />
);

const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger-fade">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-8 w-32" />
        <Pulse className="h-3 w-20" />
      </div>
    ))}
  </div>
);

const TableSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <div className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in">
    {/* Header */}
    <div className="bg-muted/50 border-b border-border px-6 py-4 flex gap-8">
      {[80, 120, 60, 100, 60].map((w, i) => (
        <Pulse key={i} className="h-3" style={{ width: w }} />
      ))}
    </div>
    {/* Rows */}
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-5 flex items-center gap-8" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex items-center gap-3 flex-1">
            <Pulse className="h-10 w-10 rounded-xl !rounded-xl" />
            <div className="space-y-2 flex-1">
              <Pulse className="h-3 w-36" />
              <Pulse className="h-2.5 w-20" />
            </div>
          </div>
          <Pulse className="h-5 w-16 rounded-full" />
          <Pulse className="h-3 w-24" />
          <Pulse className="h-3 w-20" />
          <Pulse className="h-8 w-8 rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

const CardsSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-fade">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="bg-card rounded-2xl border border-border p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-5 w-40" />
          </div>
          <Pulse className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-2 pt-3 border-t border-border">
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-3/4" />
        </div>
        <div className="flex gap-2 pt-2">
          <Pulse className="h-9 flex-1 rounded-xl" />
          <Pulse className="h-9 flex-1 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'table', rows = 6 }) => {
  return (
    <div className="p-4 md:p-8 space-y-8 page-enter">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Pulse className="h-8 w-64" />
        <Pulse className="h-4 w-96 max-w-full" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <Pulse className="h-14 flex-1 rounded-2xl" />
        <Pulse className="h-14 w-48 rounded-2xl" />
      </div>

      {/* Content skeleton */}
      {variant === 'stats' && <StatsSkeleton />}
      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'cards' && <CardsSkeleton rows={rows} />}
    </div>
  );
};

export default PageSkeleton;
export { StatsSkeleton, TableSkeleton, CardsSkeleton };
