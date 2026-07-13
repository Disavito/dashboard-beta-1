import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Box, FileText, Upload, RefreshCcw, Printer, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateBoxPDF, CajaLogica } from '@/components/archive/BoxPDFGenerator';

export default function ArchiveManagement() {
  const [localidades, setLocalidades] = useState<any[]>([]);
  const [contenedores, setContenedores] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  
  const [selectedLocalidad, setSelectedLocalidad] = useState('');
  const [selectedContenedor, setSelectedContenedor] = useState('');
  const [selectedCaja, setSelectedCaja] = useState<any>(null);

  const [inputReceipts, setInputReceipts] = useState('');
  const [inputDnis, setInputDnis] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
      const { data, error } = await supabase.from('cajas_archivo').insert({
        localidad_id: parseInt(selectedLocalidad),
        contenedor_id: parseInt(selectedContenedor)
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

  const processAssignation = async (type: 'receipts' | 'dnis') => {
    if (!selectedCaja) {
      toast.error('Selecciona una caja lógica de destino primero.');
      return;
    }

    const textInput = type === 'receipts' ? inputReceipts : inputDnis;
    const items = textInput.split(/\r?\n|,/).map((i: string) => i.trim()).filter(Boolean);

    if (items.length === 0) {
      toast.error('Ingresa al menos un dato.');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    
    try {
      // Check current capacity
      const { count: currentCount, error: countErr } = await supabase
        .from('socio_titulares')
        .select('*', { count: 'exact', head: true })
        .eq('caja_id', selectedCaja.id);

      if (countErr) throw countErr;
      const count = currentCount || 0;

      if (count + items.length > 80) {
        toast.error(`Límite Excedido (Máx 80). La caja ya contiene ${count} expedientes. Quedan ${80 - count} espacios.`);
        setIsProcessing(false);
        return;
      }

      let dnisToUpdate: string[] = [];

      if (type === 'receipts') {
        // Find DNIs from receipts in `ingresos`
        const { data: ingresos, error: errIn } = await supabase
          .from('ingresos')
          .select('socioTitular_id, receipt_number')
          .in('receipt_number', items)
          .eq('status', 'VALIDO');
          
        if (errIn) throw errIn;
        if (!ingresos || ingresos.length === 0) {
          throw new Error('No se encontraron recibos válidos asociados a socios titulares.');
        }
        
        dnisToUpdate = ingresos.map(i => i.socioTitular_id);
      } else {
        dnisToUpdate = items;
      }

      // Update `caja_id` in `socio_titulares`
      const { data: updated, error: updateErr } = await supabase
        .from('socio_titulares')
        .update({ caja_id: selectedCaja.id })
        .in('dni', dnisToUpdate)
        .select();

      if (updateErr) throw updateErr;
      
      successCount = updated?.length || 0;
      toast.success(`Se asignaron ${successCount} expedientes a la caja ${selectedCaja.codigo_etiqueta}.`);
      
      // Reload boxes to update counts
      loadData();

      // Clear inputs
      if (type === 'receipts') setInputReceipts('');
      else setInputDnis('');

    } catch (e: any) {
      toast.error('Error en el proceso', { description: e.message });
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
                      const c = cajas.find(c => String(c.id) === val);
                      setSelectedCaja(c);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige una caja..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cajas.map((c, i) => (
                          <SelectItem key={c.id || i} value={String(c.id || i)}>
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
                            <SelectItem key={c.id || i} value={String(c.id || i)}>{c.codigo_contenedor}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start justify-between">
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
              <CardTitle>Asignación de Expedientes</CardTitle>
              <CardDescription>
                Vincula expedientes físicos a la caja <strong>{selectedCaja ? selectedCaja.codigo_etiqueta : '(Ninguna)'}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="receipts" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-6">
                  <TabsTrigger value="receipts" className="font-bold"><FileText className="w-4 h-4 mr-2"/> Vía A: Por Recibos</TabsTrigger>
                  <TabsTrigger value="dnis" className="font-bold"><FileText className="w-4 h-4 mr-2"/> Vía B: Por DNIs</TabsTrigger>
                </TabsList>

                <TabsContent value="receipts" className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-400 text-sm">
                    <strong>¿Cómo funciona?</strong> Pega aquí una lista de números de recibo (uno por línea o separados por comas). El sistema buscará el DNI asociado a cada recibo válido y moverá esos expedientes a la caja seleccionada.
                  </div>
                  <Textarea 
                    placeholder="Ejemplo:&#10;500&#10;R-001050&#10;B-001"
                    className="min-h-[250px] font-mono"
                    value={inputReceipts}
                    onChange={(e) => setInputReceipts(e.target.value)}
                  />
                  <Button 
                    className="w-full bg-[#00468c] hover:bg-[#003366] text-white" 
                    size="lg"
                    disabled={isProcessing || !inputReceipts.trim() || !selectedCaja}
                    onClick={() => processAssignation('receipts')}
                  >
                    {isProcessing ? <RefreshCcw className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
                    Vincular Expedientes por Recibo
                  </Button>
                </TabsContent>

                <TabsContent value="dnis" className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl text-blue-800 dark:text-blue-400 text-sm">
                    <strong>¿Cómo funciona?</strong> Pega aquí una lista de DNIs (uno por línea o separados por comas). El sistema actualizará directamente la ubicación física de estos socios a la caja actual.
                  </div>
                  <Textarea 
                    placeholder="Ejemplo:&#10;72345678&#10;45678912"
                    className="min-h-[250px] font-mono"
                    value={inputDnis}
                    onChange={(e) => setInputDnis(e.target.value)}
                  />
                  <Button 
                    className="w-full bg-[#00468c] hover:bg-[#003366] text-white" 
                    size="lg"
                    disabled={isProcessing || !inputDnis.trim() || !selectedCaja}
                    onClick={() => processAssignation('dnis')}
                  >
                    {isProcessing ? <RefreshCcw className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
                    Vincular Expedientes por DNI
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
