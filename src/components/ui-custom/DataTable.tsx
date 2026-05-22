import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  FilterFn,
  PaginationState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, LucideIcon, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  className?: string;
  globalFilter?: string;
  setGlobalFilter?: (value: string) => void;
  customGlobalFilterFn?: FilterFn<TData>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updaterOrValue: any) => void;
  // Propiedades para estados vacíos
  emptyTitle?: string;
  emptyDescription?: string;
  EmptyIcon?: LucideIcon;
  // Propiedades para paginación manual (servidor)
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (updaterOrValue: any) => void;
  // Propiedades para virtualización
  enableVirtualization?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  className,
  globalFilter,
  setGlobalFilter,
  customGlobalFilterFn,
  rowSelection,
  onRowSelectionChange,
  emptyTitle = "No hay resultados",
  emptyDescription = "No se encontraron datos para mostrar.",
  EmptyIcon = Database,
  manualPagination = false,
  pageCount,
  pagination: controlledPagination,
  onPaginationChange,
  enableVirtualization = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  
  // Estado local para la paginación si no es controlada
  const [localPagination, setLocalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const pagination = controlledPagination || localPagination;
  const setPaginationState = onPaginationChange || setLocalPagination;

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: onRowSelectionChange,
    onPaginationChange: setPaginationState,
    globalFilterFn: customGlobalFilterFn || 'auto',
    
    // Evita que la tabla vuelva a la página 1 cuando los datos cambian
    autoResetPageIndex: !manualPagination,
    
    state: { 
      sorting,
      globalFilter,
      rowSelection: rowSelection || {},
      pagination,
    },
  });

  const { rows } = table.getRowModel();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: enableVirtualization ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 65, // Altura estimada de una fila
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div className={cn("w-full overflow-hidden flex flex-col h-full", className)}>
      <div 
        ref={enableVirtualization ? parentRef : null}
        className={cn(
          "rounded-2xl border border-gray-100 bg-white overflow-auto shadow-sm",
          enableVirtualization ? "max-h-[60vh]" : ""
        )}
      >
        <Table>
          <TableHeader className="bg-gray-50/50 sticky top-0 z-20 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-gray-100">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 text-gray-500 font-bold text-xs uppercase tracking-wider whitespace-nowrap px-4 bg-gray-50/95 backdrop-blur-sm">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#4892CC]" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando datos...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              enableVirtualization ? (
                <>
                  {paddingTop > 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} />
                    </TableRow>
                  )}
                  {virtualItems.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <TableRow key={row.id} className="border-gray-50 hover:bg-slate-50/70 transition-colors duration-150">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-4 px-4 text-sm text-gray-600 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                    </TableRow>
                  )}
                </>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="border-gray-50 hover:bg-slate-50/70 transition-colors duration-150">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4 px-4 text-sm text-gray-600 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <EmptyIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{emptyTitle}</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!enableVirtualization && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200 font-bold text-gray-600 hover:bg-[#E8F1F8] hover:text-[#4892CC] transition-all duration-200"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200 font-bold text-gray-600 hover:bg-[#E8F1F8] hover:text-[#4892CC] transition-all duration-200"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
