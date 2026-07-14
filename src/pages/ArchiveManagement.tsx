import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Box, FileText, Upload, RefreshCcw, Printer, Plus, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { generateBoxPDF, ContenedorPDFData } from '@/components/archive/BoxPDFGenerator';

const compareArchiveSocios = (a: any, b: any) => {
  const getRank = (receipt: string | null | undefined) => {
    if (!receipt) return { group: 6, val: "" };
    const trimmed = receipt.trim().toUpperCase();
    
    // 1. Números puros
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num >= 30000 && num < 40000) return { group: 1, val: num };
      if (num >= 50000 && num < 60000) return { group: 2, val: num };
      return { group: 3, val: num }; // 1 al 1300 etc.
    }
    
    // 2. Empiezan con B- o R-
    if (trimmed.startsWith('B-')) return { group: 4, val: trimmed };
    if (trimmed.startsWith('R-')) return { group: 5, val: trimmed };
    
    return { group: 6, val: trimmed }; // fallback o sin recibo válido
  };

  const rankA = getRank(a.receiptNumber);
  const rankB = getRank(b.receiptNumber);

  // Si están en distintos grupos (ej. 30000s vs 50000s vs 1-1300)
  if (rankA.group !== rankB.group) {
    return rankA.group - rankB.group;
  }

  // Si están en el grupo de 'sin recibo', ordenar por DNI numéricamente
  if (rankA.group === 6) {
    const dniA = Number(a.dni) || 0;
    const dniB = Number(b.dni) || 0;
    return dniA - dniB;
  }

  // Grupos numéricos (30000, 50000, 1-1300) -> ordenar de menor a mayor
  if (typeof rankA.val === 'number' && typeof rankB.val === 'number') {
    return rankA.val - rankB.val;
  }

  // Grupos texto (B-, R-) -> ordenar alfanuméricamente
  if (typeof rankA.val === 'string' && typeof rankB.val === 'string') {
    return rankA.val.localeCompare(rankB.val, undefined, { numeric: true, sensitivity: 'base' });
  }

  return 0;
};

export default function ArchiveManagement() {
  const [localidades, setLocalidades] = useState<any[]>([]);
  const [contenedores, setContenedores] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  
  const [selectedLocalidad, setSelectedLocalidad] = useState('');
  const [selectedContenedor, setSelectedContenedor] = useState('');
  const [selectedCaja, setSelectedCaja] = useState<any>(null);

  const [peopleInLocalidad, setPeopleInLocalidad] = useState<any[]>([]);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<Set<string>>(new Set());
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeLocalidadFilter, setActiveLocalidadFilter] = useState('');

  // New Caja Form
  const [isCreatingCaja, setIsCreatingCaja] = useState(false);
  const [newContenedorName, setNewContenedorName] = useState('');
  
  // Combobox states
  const [openLocalidadSelect, setOpenLocalidadSelect] = useState(false);
  const [openLocalidadFilter, setOpenLocalidadFilter] = useState(false);
  
  // Viewer state
  const [activeViewerContenedor, setActiveViewerContenedor] = useState<string>('');
  
  // Print selection state
  const [printSelectionOpen, setPrintSelectionOpen] = useState(false);
  const [selectedContainersToPrint, setSelectedContainersToPrint] = useState<string[]>([]);

  const getContainerCapacity = (testSize?: number) => {
    if (!selectedCaja) return 0;
    const otherBoxesInContainer = cajas.filter(c => 
      c.contenedor_id === selectedCaja.contenedor_id && 
      c.id_caja !== selectedCaja.id_caja
    );
    const otherBoxesCount = otherBoxesInContainer.reduce((acc, box) => 
      acc + (box.socio_titulares?.[0]?.count || 0), 0
    );
    return otherBoxesCount + (testSize !== undefined ? testSize : selectedPeopleIds.size);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Fetch Localidades
      const { data: locs, error: e1 } = await supabase.from('localidad_codigos').select('*');
      if (!e1) setLocalidades(locs || []);
      
      // 2. Fetch Contenedores
      const { data: conts, error: e2 } = await supabase.from('contenedores_fisicos').select('*');
      if (!e2) setContenedores(conts || []);

      // 3. Fetch Cajas
      const { data: cjs, error: e3 } = await supabase.from('cajas_archivo').select('*, localidad_codigos(nombre_localidad), contenedores_fisicos(codigo_contenedor), socio_titulares(count)');
      if (!e3) setCajas(cjs || []);

    } catch (error) {
      console.warn("Tablas de archivo no existen aún. Ejecute la migración SQL.");
    }
  };

  const handleCreateCaja = async () => {
    if (!selectedLocalidad || !selectedContenedor) {
      toast.error('Selecciona una localidad y un contenedor físico.');
      return;
    }
    try {
      // Find the name of the selected localidad to query socio_titulares
      const loc = localidades.find(l => String(l.id) === selectedLocalidad);
      let yearToUse = new Date().getFullYear();
      
      if (loc?.nombre_localidad) {
        // Find the oldest record for this association
        const { data: earliestSocio } = await supabase
          .from('socio_titulares')
          .select('created_at')
          .eq('localidad', loc.nombre_localidad)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
          
        if (earliestSocio && earliestSocio.created_at) {
          yearToUse = new Date(earliestSocio.created_at).getFullYear();
        }
      }

      const { data, error } = await supabase.from('cajas_archivo').insert({
        localidad_id: parseInt(selectedLocalidad),
        contenedor_id: parseInt(selectedContenedor),
        anio: yearToUse
      }).select('*, localidad_codigos(nombre_localidad), contenedores_fisicos(codigo_contenedor)').single();

      if (error) throw error;
      toast.success('Caja Lógica creada exitosamente');
      setCajas([...cajas, data]);
      setSelectedCaja(data);
      setIsCreatingCaja(false);
    } catch (e: any) {
      toast.error('Error al crear caja', { description: e.message });
    }
  };

  const handleCreateContenedor = async () => {
    if (!newContenedorName.trim()) return;
    try {
      const { data, error } = await supabase.from('contenedores_fisicos').insert({
        codigo_contenedor: newContenedorName.trim().toUpperCase()
      }).select().single();

      if (error) throw error;
      toast.success('Contenedor creado');
      setContenedores([...contenedores, data]);
      setSelectedContenedor(String(data.id));
      setNewContenedorName('');
    } catch (e: any) {
      toast.error('Error al crear contenedor', { description: e.message });
    }
  };

  const handleDeleteCaja = async (id_caja: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta caja lógica? Esto no borrará los expedientes, solo los dejará "sin caja".')) return;
    try {
      setIsProcessing(true);
      // Primero desvincular los expedientes manualmente por si no hay ON DELETE SET NULL en la BD
      await supabase.from('socio_titulares').update({ caja_id: null }).eq('caja_id', id_caja);
      
      const { error } = await supabase.from('cajas_archivo').delete().eq('id_caja', id_caja);
      if (error) throw error;
      toast.success('Caja eliminada');
      setSelectedCaja(null);
      loadData();
    } catch(e: any) {
      toast.error('Error al eliminar la caja', { description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteContenedor = async (id_contenedor: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este contenedor físico? Las cajas dentro quedarán "sin contenedor".')) return;
    try {
      setIsProcessing(true);
      // Primero desvincular las cajas lógicas manualmente
      await supabase.from('cajas_archivo').update({ contenedor_id: null }).eq('contenedor_id', parseInt(id_contenedor));

      const { error } = await supabase.from('contenedores_fisicos').delete().eq('id_contenedor', parseInt(id_contenedor));
      if (error) throw error;
      toast.success('Contenedor eliminado');
      setSelectedContenedor('');
      loadData();
    } catch(e: any) {
      toast.error('Error al eliminar el contenedor', { description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchPeople = async () => {
    if (!activeLocalidadFilter || !selectedCaja) {
      setPeopleInLocalidad([]);
      setSelectedPeopleIds(new Set());
      return;
    }
    
    setIsLoadingPeople(true);
    try {
      const { data, error } = await supabase
        .from('vw_socio_titulares_estado')
        .select('id, nombres, apellidoPaterno, apellidoMaterno, dni, receiptNumber, caja_id')
        .eq('localidad', activeLocalidadFilter);

      if (error) throw error;
      
      const sortedData = (data || []).sort(compareArchiveSocios);
      setPeopleInLocalidad(sortedData);
      
      const inBox = (data || []).filter(p => p.caja_id === selectedCaja.id_caja).map(p => p.id);
      setSelectedPeopleIds(new Set(inBox));
    } catch (e: any) {
      toast.error('Error al cargar personas de la localidad', { description: e.message });
    } finally {
      setIsLoadingPeople(false);
    }
  };

  useEffect(() => {
    if (selectedCaja?.localidad_codigos?.nombre_localidad) {
      setActiveLocalidadFilter(selectedCaja.localidad_codigos.nombre_localidad);
    } else {
      setActiveLocalidadFilter('');
    }
  }, [selectedCaja]);

  useEffect(() => {
    fetchPeople();
  }, [activeLocalidadFilter]);

  const handleTogglePerson = (person: any) => {
    const isAssignedToOther = person.caja_id && person.caja_id !== selectedCaja?.id_caja;
    if (isAssignedToOther) {
      toast.warning('Esta persona ya está asignada a otra caja.');
      return;
    }

    const next = new Set(selectedPeopleIds);
    if (next.has(person.id)) {
      next.delete(person.id);
    } else {
      if (getContainerCapacity(next.size + 1) > 80) {
        toast.error('Límite Excedido. El contenedor físico solo puede almacenar hasta 80 expedientes en total.');
        return;
      }
      next.add(person.id);
    }
    setSelectedPeopleIds(next);
  };

  const handleSaveChanges = async () => {
    if (!selectedCaja) return;
    setIsProcessing(true);
    
    try {
      const originallyInBox = new Set(peopleInLocalidad.filter(p => p.caja_id === selectedCaja.id_caja).map(p => p.id));
      const toAdd = [...selectedPeopleIds].filter(id => !originallyInBox.has(id));
      const toRemove = [...originallyInBox].filter(id => !selectedPeopleIds.has(id));

      if (toAdd.length > 0) {
        const { error: errAdd } = await supabase.from('socio_titulares').update({ caja_id: selectedCaja.id_caja }).in('id', toAdd);
        if (errAdd) throw errAdd;
      }

      if (toRemove.length > 0) {
        const { error: errRem } = await supabase.from('socio_titulares').update({ caja_id: null }).in('id', toRemove);
        if (errRem) throw errRem;
      }

      const totalChanges = toAdd.length + toRemove.length;
      if (totalChanges > 0) {
        toast.success(`Caja ${selectedCaja.codigo_etiqueta} actualizada correctamente. (${toAdd.length} agregados, ${toRemove.length} removidos)`);
        loadData(); // actualiza cuentas de cajas
        fetchPeople(); // recarga lista
      } else {
        toast.info('No hay cambios para guardar.');
      }
    } catch(e: any) {
      toast.error('Error al guardar cambios', { description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPDF = () => {
    if (!selectedCaja) return;
    const c_id = selectedCaja.contenedor_id;
    const physicalCont = contenedores.find(c => c.id_contenedor === c_id);
    const boxesInCont = cajas.filter(c => c.contenedor_id === c_id);
    
    const data: ContenedorPDFData = {
      codigo_contenedor: physicalCont?.codigo_contenedor || 'SIN-CONTENEDOR',
      cajas_logicas: boxesInCont.map(b => ({
        codigo_etiqueta: b.codigo_etiqueta,
        localidad: b.localidad_codigos?.nombre_localidad || 'Desconocida'
      }))
    };
    generateBoxPDF([data]);
  };

  const printViewerContainer = () => {
    if (!activeViewerContenedor) return;
    const contObj = contenedores.find(c => String(c.id_contenedor) === activeViewerContenedor);
    const cajasDelCont = cajas.filter(c => String(c.contenedor_id) === activeViewerContenedor);
    
    const data: ContenedorPDFData = {
      codigo_contenedor: contObj?.codigo_contenedor || 'SIN-CONTENEDOR',
      cajas_logicas: cajasDelCont.map(c => ({
        codigo_etiqueta: c.codigo_etiqueta,
        localidad: c.localidad_codigos?.nombre_localidad || 'Desconocida'
      }))
    };
    generateBoxPDF([data]);
  };

  const handlePrintSelected = () => {
    if (selectedContainersToPrint.length === 0) {
      toast.error("Seleccione al menos un contenedor para imprimir.");
      return;
    }
    const data: ContenedorPDFData[] = selectedContainersToPrint.map(id_cont => {
      const contObj = contenedores.find(c => String(c.id_contenedor) === id_cont);
      const cajasDelCont = cajas.filter(c => String(c.contenedor_id) === id_cont);
      return {
        codigo_contenedor: contObj?.codigo_contenedor || 'SIN-CONTENEDOR',
        cajas_logicas: cajasDelCont.map(c => ({
          codigo_etiqueta: c.codigo_etiqueta,
          localidad: c.localidad_codigos?.nombre_localidad || 'Desconocida'
        }))
      };
    });
    
    const validData = data.filter(d => d.cajas_logicas.length > 0);
    if (validData.length === 0) {
      toast.error('No hay contenedores con cajas asignadas para imprimir.');
      return;
    }
    generateBoxPDF(validData);
    setPrintSelectionOpen(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-[#00468c] flex items-center gap-3">
          <Box className="w-8 h-8" />
          Archivo Central Físico
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las cajas de archivo, contenedores, asignación masiva de expedientes y generación de códigos QR.
        </p>
      </div>

      <Tabs defaultValue="asignacion" className="space-y-6">
        <div className="flex justify-start">
          <TabsList className="bg-slate-100 dark:bg-slate-900 h-auto p-1 rounded-lg">
            <TabsTrigger value="asignacion" className="px-6 py-2">Asignar Expedientes a Cajas</TabsTrigger>
            <TabsTrigger value="visor" className="px-6 py-2">Explorar Contenedores Físicos</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="asignacion" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* PANEL IZQUIERDO: SELECCIÓN DE CAJA */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-[#00468c] shadow-md">
            <CardHeader>
              <CardTitle>Caja Activa</CardTitle>
              <CardDescription>Selecciona o crea la caja donde guardarás los documentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCreatingCaja ? (
                <>
                  <div className="space-y-2">
                    <Label>Seleccionar Caja Existente</Label>
                    <Select onValueChange={(val) => {
                      const c = cajas.find(c => String(c.id_caja) === val);
                      setSelectedCaja(c);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige una caja..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cajas.map((c, i) => (
                          <SelectItem key={c.id_caja || i} value={String(c.id_caja || i)}>
                            {c.codigo_etiqueta} ({c.localidad_codigos?.nombre_localidad})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setIsCreatingCaja(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Crear Nueva Caja Lógica
                  </Button>
                </>
              ) : (
                <div className="space-y-4 border p-4 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <div className="space-y-2 flex flex-col">
                    <Label>Localidad / Proyecto</Label>
                    <Popover open={openLocalidadSelect} onOpenChange={setOpenLocalidadSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openLocalidadSelect}
                          className="w-full justify-between font-normal"
                        >
                          {selectedLocalidad
                            ? localidades.find((l) => String(l.id) === selectedLocalidad)?.nombre_localidad
                            : "Seleccione una localidad..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar localidad..." />
                          <CommandList>
                            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                            <CommandGroup>
                              {localidades
                                .sort((a, b) => a.nombre_localidad.localeCompare(b.nombre_localidad))
                                .map((l) => (
                                <CommandItem
                                  key={l.id}
                                  value={l.nombre_localidad}
                                  onSelect={() => {
                                    setSelectedLocalidad(String(l.id));
                                    setOpenLocalidadSelect(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedLocalidad === String(l.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {l.nombre_localidad}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Contenedor Físico (Rack/Caja Mayor)</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={setSelectedContenedor} value={selectedContenedor}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contenedores.map((c, i) => (
                            <SelectItem key={c.id_contenedor || i} value={String(c.id_contenedor || i)}>{c.codigo_contenedor}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedContenedor && (
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleDeleteContenedor(selectedContenedor)}
                          disabled={isProcessing}
                          title="Eliminar Contenedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">¿Nuevo Contenedor?</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ej: CONT-001" 
                        value={newContenedorName} 
                        onChange={e => setNewContenedorName(e.target.value)}
                      />
                      <Button onClick={handleCreateContenedor} variant="secondary">Add</Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleCreateCaja} className="flex-1 bg-[#00468c] hover:bg-[#003366]">Generar</Button>
                    <Button onClick={() => setIsCreatingCaja(false)} variant="ghost">Cancelar</Button>
                  </div>
                </div>
              )}

              {selectedCaja && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteCaja(selectedCaja.id_caja)}
                    title="Eliminar Caja Lógica"
                    disabled={isProcessing}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div className="flex items-start justify-between pr-8">
                    <div>
                      <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1">Caja Seleccionada:</h3>
                      <p className="text-2xl font-black text-[#00468c] dark:text-blue-400">{selectedCaja.codigo_etiqueta}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-blue-800/60 dark:text-blue-300/60">Cap. Contenedor</span>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {getContainerCapacity()} <span className="text-sm">/ 80</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-3 flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
                    <div className="flex items-center">
                      <strong>Contenedor:</strong> <span className="ml-1 mr-2">{selectedCaja.contenedores_fisicos?.codigo_contenedor}</span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-700 hover:bg-blue-200" title="Ver contenido del contenedor">
                            <Info className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Contenido del {selectedCaja.contenedores_fisicos?.codigo_contenedor}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-lg font-bold">
                              <span>Capacidad Ocupada:</span>
                              <span>{getContainerCapacity()} / 80 expedientes</span>
                            </div>
                            
                            <h4 className="font-semibold text-sm text-muted-foreground mt-4 mb-2">Cajas Lógicas (Archivadores):</h4>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                              {cajas
                                .filter(c => c.contenedor_id === selectedCaja.contenedor_id)
                                .map(box => {
                                  const isCurrent = box.id_caja === selectedCaja.id_caja;
                                  const count = isCurrent ? selectedPeopleIds.size : (box.socio_titulares?.[0]?.count || 0);
                                  
                                  return (
                                    <div key={box.id_caja} className={`flex justify-between items-center p-3 rounded-lg border ${isCurrent ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'bg-white dark:bg-slate-900'}`}>
                                      <div>
                                        <p className="font-medium text-sm">
                                          {box.codigo_etiqueta} 
                                          {isCurrent && <Badge variant="outline" className="ml-2 text-[10px] bg-blue-100 border-blue-200 text-blue-700">Viendo ahora</Badge>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{box.localidad_codigos?.nombre_localidad}</p>
                                      </div>
                                      <Badge variant="secondary">{count} exp.</Badge>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div>
                      <strong>Localidad:</strong> <span className="ml-1">{selectedCaja.localidad_codigos?.nombre_localidad}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full mt-4 bg-white text-[#00468c] hover:bg-gray-100 border border-[#00468c]"
                    onClick={downloadPDF}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Etiqueta (PDF)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PANEL DERECHO: ASIGNACIÓN */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="h-full shadow-md border-border/50">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle>Asignación de Expedientes</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      Viendo asociación:
                    </span>
                    <Popover open={openLocalidadFilter} onOpenChange={setOpenLocalidadFilter}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openLocalidadFilter}
                        className="w-[300px] justify-between font-normal"
                      >
                        {activeLocalidadFilter || "Viendo asociación..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar asociación..." />
                        <CommandList>
                          <CommandEmpty>No se encontró ninguna.</CommandEmpty>
                          <CommandGroup>
                            {localidades
                              .sort((a, b) => a.nombre_localidad.localeCompare(b.nombre_localidad))
                              .map((l) => (
                              <CommandItem
                                key={l.id}
                                value={l.nombre_localidad}
                                onSelect={() => {
                                  setActiveLocalidadFilter(l.nombre_localidad);
                                  setOpenLocalidadFilter(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    activeLocalidadFilter === l.nombre_localidad ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {l.nombre_localidad}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  </div>
                </div>
                {selectedCaja && (
                  <div className="text-right">
                    <span className="text-sm font-bold text-muted-foreground mr-2">Cap. Contenedor: </span>
                    <Badge variant={getContainerCapacity() === 80 ? "destructive" : "default"} className="text-sm px-3 py-1">
                      {getContainerCapacity()} / 80
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCaja ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl border-muted bg-slate-50 dark:bg-slate-900/50">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Selecciona una caja en el panel izquierdo para comenzar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 gap-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Marca las personas cuyos expedientes guardarás en la caja <strong>{selectedCaja.codigo_etiqueta}</strong>. Puedes cambiar la asociación arriba para agregar expedientes de otras localidades a esta misma caja.
                    </p>
                    <Button 
                      onClick={handleSaveChanges} 
                      disabled={isProcessing}
                      className="bg-[#00468c] hover:bg-[#003366] shrink-0"
                    >
                      {isProcessing ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Guardar Cambios
                    </Button>
                  </div>

                  {isLoadingPeople ? (
                    <div className="flex justify-center p-12">
                      <RefreshCcw className="w-8 h-8 animate-spin text-[#00468c]" />
                    </div>
                  ) : peopleInLocalidad.length === 0 ? (
                    <div className="text-center p-12 border rounded-xl bg-slate-50 dark:bg-slate-900/50 text-muted-foreground">
                      No se encontraron socios registrados para la localidad {selectedCaja.localidad_codigos?.nombre_localidad}.
                    </div>
                  ) : (
                    <div className="border rounded-md max-h-[500px] overflow-y-auto bg-white dark:bg-background">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm border-b">
                          <tr>
                            <th className="px-4 py-3 w-16 text-center">En Caja</th>
                            <th className="px-4 py-3">Socio Titular</th>
                            <th className="px-4 py-3 w-28">DNI</th>
                            <th className="px-4 py-3 w-32">Recibo</th>
                            <th className="px-4 py-3 w-32">Estado actual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {peopleInLocalidad.map(p => {
                            const isSelected = selectedPeopleIds.has(p.id);
                            const isAssignedToOther = p.caja_id && p.caja_id !== selectedCaja.id_caja;
                            
                            return (
                              <tr 
                                key={p.id} 
                                className={`transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'} ${isAssignedToOther ? 'opacity-60' : ''}`}
                                onClick={() => { if (!isAssignedToOther) handleTogglePerson(p) }}
                              >
                                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={() => handleTogglePerson(p)}
                                    disabled={isAssignedToOther || (getContainerCapacity(selectedPeopleIds.size + 1) > 80 && !isSelected) || isProcessing}
                                    className="cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium cursor-pointer">
                                  {p.apellidoPaterno} {p.apellidoMaterno}, {p.nombres}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{p.dni}</td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.receiptNumber || 'N/A'}</td>
                                <td className="px-4 py-3">
                                  {isAssignedToOther ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                      En otra caja
                                    </span>
                                  ) : isSelected ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      En esta caja
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                      Sin caja
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

          </div>
        </TabsContent>

        <TabsContent value="visor" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="border-t-4 border-t-emerald-600 shadow-md">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Visor de Contenedores Físicos</CardTitle>
                <CardDescription>Selecciona un contenedor para explorar su capacidad y las cajas lógicas en su interior.</CardDescription>
              </div>
              <Dialog open={printSelectionOpen} onOpenChange={setPrintSelectionOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 h-9" 
                    onClick={() => {
                      const validConts = contenedores.filter(c => cajas.some(b => b.contenedor_id === c.id_contenedor));
                      setSelectedContainersToPrint(validConts.map(c => String(c.id_contenedor)));
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Impresión por Lotes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Impresión de Etiquetas</DialogTitle>
                    <DialogDescription>Selecciona los contenedores que deseas imprimir. Se agruparán automáticamente de 2 en 2 por hoja (A4).</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 py-4 px-1">
                    {contenedores.filter(c => cajas.some(b => b.contenedor_id === c.id_contenedor)).map(c => (
                      <div key={c.id_contenedor} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <Checkbox 
                          id={`print-${c.id_contenedor}`} 
                          checked={selectedContainersToPrint.includes(String(c.id_contenedor))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedContainersToPrint(prev => [...prev, String(c.id_contenedor)]);
                            } else {
                              setSelectedContainersToPrint(prev => prev.filter(id => id !== String(c.id_contenedor)));
                            }
                          }}
                        />
                        <label htmlFor={`print-${c.id_contenedor}`} className="flex-1 text-sm font-medium leading-none cursor-pointer">
                          {c.codigo_contenedor} <span className="text-muted-foreground ml-2">({cajas.filter(b => b.contenedor_id === c.id_contenedor).length} cajas)</span>
                        </label>
                      </div>
                    ))}
                    {contenedores.filter(c => cajas.some(b => b.contenedor_id === c.id_contenedor)).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">No hay contenedores con cajas asignadas.</p>
                    )}
                  </div>
                  <Button onClick={handlePrintSelected} className="w-full bg-[#00468c] hover:bg-[#00468c]/90">
                    <Printer className="w-4 h-4 mr-2" /> Generar PDF ({selectedContainersToPrint.length})
                  </Button>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Selector */}
                <div className="max-w-md space-y-2">
                  <Label>Seleccionar Contenedor</Label>
                  <Select value={activeViewerContenedor} onValueChange={setActiveViewerContenedor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige un contenedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contenedores.map(c => (
                        <SelectItem key={c.id_contenedor} value={String(c.id_contenedor)}>
                          {c.codigo_contenedor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeViewerContenedor ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {(() => {
                      const boxesInCont = cajas.filter(c => String(c.contenedor_id) === activeViewerContenedor);
                      const totalExpedientes = boxesInCont.reduce((acc, b) => acc + (b.socio_titulares?.[0]?.count || 0), 0);
                      const percent = Math.min((totalExpedientes / 80) * 100, 100);
                      
                      return (
                        <>
                          <div className="space-y-4">
                            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 uppercase mb-1">Capacidad Total</p>
                              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                                {totalExpedientes} <span className="text-xl text-emerald-700/50">/ 80</span>
                              </p>
                              <Progress value={percent} className="h-2 mt-4 [&>div]:bg-emerald-500" />
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border flex flex-col justify-center">
                              <p className="text-sm font-semibold text-muted-foreground uppercase mb-1">Cajas Lógicas (Archivadores)</p>
                              <p className="text-3xl font-bold mb-4">{boxesInCont.length}</p>
                              <Button onClick={printViewerContainer} variant="outline" className="w-full">
                                <Printer className="w-4 h-4 mr-2" />
                                Imprimir Etiqueta
                              </Button>
                            </div>
                          </div>

                          <div className="lg:col-span-2 border rounded-xl bg-white dark:bg-slate-950 overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-100 dark:bg-slate-900 text-xs uppercase font-semibold text-muted-foreground">
                                <tr>
                                  <th className="px-4 py-3">Código Caja</th>
                                  <th className="px-4 py-3">Asociación / Proyecto</th>
                                  <th className="px-4 py-3 text-right">Expedientes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {boxesInCont.length === 0 ? (
                                  <tr>
                                    <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                                      Este contenedor está vacío actualmente.
                                    </td>
                                  </tr>
                                ) : (
                                  boxesInCont.map(box => (
                                    <tr key={box.id_caja} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                      <td className="px-4 py-3 font-medium text-[#00468c] dark:text-blue-400">{box.codigo_etiqueta}</td>
                                      <td className="px-4 py-3">{box.localidad_codigos?.nombre_localidad}</td>
                                      <td className="px-4 py-3 text-right font-semibold">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-800 hover:bg-slate-200">{box.socio_titulares?.[0]?.count || 0}</Badge>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl border-muted bg-slate-50 dark:bg-slate-900/50">
                      <Box className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                      <p className="text-muted-foreground">Selecciona un contenedor arriba para explorar lo que tiene dentro.</p>
                   </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
