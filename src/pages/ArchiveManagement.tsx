import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Box, FileText, Upload, RefreshCcw, Printer, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { generateBoxPDF, CajaLogica } from '@/components/archive/BoxPDFGenerator';

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
      if (next.size >= 80) {
        toast.error('Límite Excedido. Una caja solo puede contener hasta 80 expedientes.');
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
    const cajaData: CajaLogica = {
      codigo_etiqueta: selectedCaja.codigo_etiqueta,
      localidad: selectedCaja.localidad_codigos?.nombre_localidad || 'Desconocida',
      codigo_contenedor: selectedCaja.contenedores_fisicos?.codigo_contenedor || 'SIN-CONTENEDOR'
    };
    generateBoxPDF([cajaData]);
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
                  <div className="space-y-2">
                    <Label>Localidad / Proyecto</Label>
                    <Select onValueChange={setSelectedLocalidad}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {localidades.map((l, i) => (
                          <SelectItem key={l.id || i} value={String(l.id || i)}>{l.nombre_localidad}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <span className="text-[10px] font-black uppercase text-blue-800/60 dark:text-blue-300/60">Capacidad</span>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {selectedCaja.socio_titulares?.[0]?.count || 0} <span className="text-sm">/ 80</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
                    <strong>Contenedor:</strong> {selectedCaja.contenedores_fisicos?.codigo_contenedor} <br/>
                    <strong>Localidad:</strong> {selectedCaja.localidad_codigos?.nombre_localidad}
                  </p>
                  
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
                    <Select 
                      disabled={!selectedCaja || isProcessing}
                      value={activeLocalidadFilter} 
                      onValueChange={setActiveLocalidadFilter}
                    >
                      <SelectTrigger className="w-full max-w-[300px] h-9 text-sm">
                        <SelectValue placeholder="Seleccionar asociación" />
                      </SelectTrigger>
                      <SelectContent>
                        {localidades.map((l, i) => (
                          <SelectItem key={l.id || i} value={l.nombre_localidad}>{l.nombre_localidad}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedCaja && (
                  <div className="text-right">
                    <span className="text-sm font-bold text-muted-foreground mr-2">Capacidad: </span>
                    <Badge variant={selectedPeopleIds.size === 80 ? "destructive" : "default"} className="text-sm px-3 py-1">
                      {selectedPeopleIds.size} / 80
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
                                    disabled={isAssignedToOther || (selectedPeopleIds.size >= 80 && !isSelected) || isProcessing}
                                    onCheckedChange={() => handleTogglePerson(p)}
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
    </div>
  );
}
