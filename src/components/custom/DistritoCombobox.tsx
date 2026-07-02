import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { cn, smartSearch } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

interface DistritoComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

export default function DistritoCombobox({
  value,
  onValueChange,
  className,
  triggerClassName,
  placeholder = 'Todos los Distritos',
}: DistritoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [distritos, setDistritos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDistritos = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('socio_titulares')
      .select('distritoVivienda')
      .neq('distritoVivienda', '')
      .not('distritoVivienda', 'is', null)
      .order('distritoVivienda', { ascending: true });

    if (!error && data) {
      const unique = Array.from(new Set(data.map(item => item.distritoVivienda))).filter(Boolean) as string[];
      setDistritos(unique);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDistritos();
  }, [fetchDistritos]);

  // Refetch when popover opens to pick up newly added distritos
  useEffect(() => {
    if (open) fetchDistritos();
  }, [open, fetchDistritos]);

  const filteredDistritos = distritos.filter(d =>
    smartSearch(searchQuery, [d])
  );

  const displayValue = value === 'all' ? placeholder : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-muted/50 border-none rounded-2xl font-bold text-foreground/80 hover:bg-muted",
            !value || value === 'all' ? "text-muted-foreground" : "text-foreground/80",
            triggerClassName,
            className
          )}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-4 h-4 text-[#4892CC] shrink-0" />
            <span className="truncate">{displayValue}</span>
          </div>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card dark:bg-slate-900 border-border/50 rounded-xl shadow-lg">
        <Command>
          <CommandInput
            placeholder="Buscar distrito..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No se encontró distrito.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onValueChange('all');
                  setOpen(false);
                  setSearchQuery('');
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === 'all' ? "opacity-100" : "opacity-0")} />
                {placeholder}
              </CommandItem>
              {filteredDistritos.map((distrito) => (
                <CommandItem
                  value={distrito}
                  key={distrito}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === distrito ? "opacity-100" : "opacity-0")} />
                  {distrito}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
