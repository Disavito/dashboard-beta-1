import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableWidgetProps {
  id: string;
  isEditMode: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SortableWidget({ id, isEditMode, children, className }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200",
        isEditMode && "ring-2 ring-dashed ring-primary/30 rounded-2xl bg-muted/10 hover:ring-primary/50 shadow-inner",
        isDragging && "shadow-2xl ring-solid ring-primary opacity-60 scale-[1.02]",
        className
      )}
    >
      {isEditMode && (
        <div 
          className="absolute top-3 right-3 z-30 flex items-center justify-center w-8 h-8 rounded-xl bg-card border border-border text-muted-foreground cursor-grab active:cursor-grabbing hover:bg-accent hover:text-foreground transition-colors shadow-sm animate-in fade-in zoom-in duration-300"
          {...attributes}
          {...listeners}
          title="Arrastra para reordenar"
        >
          <GripVertical className="w-4.5 h-4.5" />
        </div>
      )}
      
      {/* Provide a container with a subtle visual overlay during edit mode to show it is interactive */}
      <div className={cn(
        "h-full w-full",
        isEditMode && "pointer-events-none select-none opacity-85"
      )}>
        {children}
      </div>
    </div>
  );
}
