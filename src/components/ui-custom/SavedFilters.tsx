import { useState } from 'react';
import { Bookmark, Trash2, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { cn } from '@/lib/utils';

interface SavedFiltersProps {
  pageKey: string;
  currentFilters: Record<string, any>;
  onApplyFilter: (filters: Record<string, any>) => void;
}

/** Check whether at least one filter value is non-default */
function hasActiveFilters(filters: Record<string, any>): boolean {
  return Object.values(filters).some((v) => {
    if (v === '' || v === 'all' || v === null || v === undefined) return false;
    return true;
  });
}

export default function SavedFilters({
  pageKey,
  currentFilters,
  onApplyFilter,
}: SavedFiltersProps) {
  const { savedFilters, saveFilter, deleteFilter, applyFilter } =
    useSavedFilters(pageKey);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState(false);

  const filtersActive = hasActiveFilters(currentFilters);

  const handleSave = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    saveFilter(trimmed, currentFilters);
    setNewName('');
    setIsAdding(false);
  };

  const handleApply = (id: string) => {
    const filters = applyFilter(id);
    if (filters) {
      onApplyFilter(filters);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-14 px-4 rounded-2xl border-border bg-muted/50 hover:bg-muted transition-all gap-2 font-bold text-muted-foreground',
            savedFilters.length > 0 && 'border-corp-blue/30 text-corp-blue'
          )}
        >
          <Bookmark
            className={cn(
              'h-4 w-4',
              savedFilters.length > 0 && 'fill-corp-blue/20'
            )}
          />
          <span className="hidden sm:inline">Vistas</span>
          {savedFilters.length > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-corp-blue/10 text-[10px] font-black text-corp-blue">
              {savedFilters.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-72 p-0 rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 bg-muted/50/60">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
            Filtros Guardados
          </p>
        </div>

        {/* Saved filter list */}
        <div className="max-h-52 overflow-y-auto">
          {savedFilters.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Bookmark className="h-8 w-8 mx-auto text-slate-200 mb-2" />
              <p className="text-xs text-muted-foreground/70 font-medium">
                Aún no tienes filtros guardados
              </p>
            </div>
          ) : (
            savedFilters.map((sf) => (
              <div
                key={sf.id}
                className="group flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleApply(sf.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-corp-blue/10">
                    <Bookmark className="h-3 w-3 text-corp-blue" />
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {sf.name}
                  </span>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFilter(sf.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Save new filter */}
        <div className="border-t border-border/50 p-3">
          {isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewName('');
                  }
                }}
                placeholder="Nombre del filtro..."
                className="h-9 text-sm rounded-xl bg-muted/50 border-border placeholder:text-muted-foreground/70"
              />
              <Button
                size="icon"
                disabled={!newName.trim()}
                onClick={handleSave}
                className="h-9 w-9 shrink-0 rounded-xl bg-corp-blue hover:bg-corp-blue/90 text-white"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              disabled={!filtersActive}
              onClick={() => setIsAdding(true)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all',
                filtersActive
                  ? 'text-corp-blue hover:bg-corp-blue/5 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              )}
            >
              <Plus className="h-4 w-4" />
              Guardar vista actual
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
