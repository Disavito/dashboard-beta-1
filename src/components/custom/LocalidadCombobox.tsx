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
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

interface LocalidadComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  distritoFilter?: string;
}

export default function LocalidadCombobox({
  value,
  onValueChange,
  className,
  triggerClassName,
  placeholder = 'Todas las Comunidades',
  distritoFilter,
}: LocalidadComboboxProps) {
  const [open, setOpen] = useState(false);
  const [localities, setLocalities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLocalities = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('socio_titulares')
      .select('localidad')
      .neq('localidad', '');

    if (distritoFilter && distritoFilter !== 'all') {
      query = query.eq('distritoVivienda', distritoFilter);
    }

    const { data, error } = await query.order('localidad', { ascending: true });

    if (!error && data) {
      const unique = Array.from(new Set(data.map(item => item.localidad))).filter(Boolean) as string[];
      setLocalities(unique);
    }
    setIsLoading(false);
  }, [distritoFilter]);

  // Fetch on mount
  useEffect(() => {
    fetchLocalities();
  }, [fetchLocalities]);

  // Refetch when popover opens to pick up newly added localities
  useEffect(() => {
    if (open) fetchLocalities();
  }, [open, fetchLocalities]);

  const filteredLocalities = localities.filter(loc =>
    loc.toLowerCase().includes(searchQuery.toLowerCase())
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
            "justify-between bg-gray-50 border-none rounded-2xl font-bold text-gray-700 hover:bg-gray-100",
            !value || value === 'all' ? "text-gray-500" : "text-gray-700",
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
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white border-gray-100 rounded-xl shadow-lg">
        <Command>
          <CommandInput
            placeholder="Buscar localidad..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No se encontró localidad.</CommandEmpty>
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
              {filteredLocalities.map((loc) => (
                <CommandItem
                  value={loc}
                  key={loc}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === loc ? "opacity-100" : "opacity-0")} />
                  {loc}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
