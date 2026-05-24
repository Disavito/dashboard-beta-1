import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  HelpCircle, BookOpen, Clock, UserCheck, FolderOpen, 
  Wallet, ArrowUpCircle, ArrowDownCircle, FileText, 
  Package, Shield, FileCheck, ClipboardList, CheckCircle2,
  AlertTriangle, Play, Info
} from 'lucide-react';

const HelpPage: React.FC = () => {
  const { roles, customPermissions } = useUser();
  const [activeTab, setActiveTab] = useState<string>('welcome');

  // Detectar rol y permisos para seleccionar pestaña por defecto
  const isAdmin = roles?.some(r => r.toLowerCase().includes('admin')) ?? false;
  const isFinance = roles?.some(r => r.toLowerCase().includes('finan')) ?? false;
  const isEngineer = roles?.some(r => r.toLowerCase().includes('engine') || r.toLowerCase().includes('ingenier')) ?? false;
  const canManageInventory = !!customPermissions?.can_manage_inventory || isAdmin;

  useEffect(() => {
    if (isAdmin) {
      setActiveTab('admin');
    } else if (isFinance) {
      setActiveTab('finanzas');
    } else if (isEngineer) {
      setActiveTab('ingeniero');
    } else if (canManageInventory) {
      setActiveTab('inventario');
    }
  }, [roles, customPermissions, isAdmin, isFinance, isEngineer, canManageInventory]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] pb-20 page-enter">
      {/* Header */}
      <header className="relative h-64 md:h-72 flex items-center overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent z-0"></div>
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <BookOpen className="w-full h-full text-primary" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-primary/10 text-primary border-none font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest">
              Centro de Aprendizaje
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">
              Guías de <span className="text-primary">Usuario & Manuales</span>
            </h1>
            <p className="text-base md:text-lg text-gray-500 font-medium leading-relaxed">
              Consulta de forma interactiva el funcionamiento de los módulos del Dashboard asignados a tu rol.
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 -mt-10 relative z-20">
        {/* Banner de Roles Activos */}
        <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-glass mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tu perfil actual</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-slate-700">Roles:</span>
                {roles?.map(r => (
                  <Badge key={r} className="bg-slate-100 text-slate-700 capitalize font-bold text-[10px]">{r}</Badge>
                )) || <Badge className="bg-slate-100 text-slate-700">Usuario</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
            <Info className="w-4 h-4 text-primary" />
            <span>Los manuales se muestran automáticamente según tus accesos.</span>
          </div>
        </div>

        {/* Tabs de Manuales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto bg-white border border-slate-200/60 p-1.5 rounded-2xl shadow-sm mb-8 gap-1.5 w-fit">
            {isEngineer && (
              <TabsTrigger 
                value="ingeniero" 
                className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-slate-500 transition-all text-xs"
              >
                <ClipboardList className="w-4 h-4 mr-2" /> Manual de Ingeniero
              </TabsTrigger>
            )}
            {isFinance && (
              <TabsTrigger 
                value="finanzas" 
                className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-slate-500 transition-all text-xs"
              >
                <Wallet className="w-4 h-4 mr-2" /> Manual de Finanzas
              </TabsTrigger>
            )}
            {isAdmin && (
              <>
                <TabsTrigger 
                  value="admin" 
                  className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-slate-500 transition-all text-xs"
                >
                  <Shield className="w-4 h-4 mr-2" /> Manual de Administrador
                </TabsTrigger>
                <TabsTrigger 
                  value="ingeniero" 
                  className="rounded-xl px-5 py-2.5 data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-500 transition-all text-xs"
                >
                  <ClipboardList className="w-4 h-4 mr-2" /> Vista Ingeniero
                </TabsTrigger>
                <TabsTrigger 
                  value="finanzas" 
                  className="rounded-xl px-5 py-2.5 data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-500 transition-all text-xs"
                >
                  <Wallet className="w-4 h-4 mr-2" /> Vista Finanzas
                </TabsTrigger>
              </>
            )}
            {canManageInventory && (
              <TabsTrigger 
                value="inventario" 
                className="rounded-xl px-5 py-2.5 data-[state=active]:bg-[#4892CC] data-[state=active]:text-white font-bold text-slate-500 transition-all text-xs"
              >
                <Package className="w-4 h-4 mr-2" /> Manual de Inventario
              </TabsTrigger>
            )}
          </TabsList>

          {/* CONTENIDO: INGENIERO */}
          <TabsContent value="ingeniero" className="space-y-6 focus-visible:outline-none">
            <Card className="rounded-3xl border-none shadow-premium bg-white p-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 border-b pb-4 mb-6 uppercase tracking-tight">
                <ClipboardList className="w-6 h-6 text-primary" />
                Manual Operativo del Ingeniero en el Dashboard
              </h2>

              <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
                <section className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base mb-2">
                    <Info className="w-5 h-5 text-primary" /> 1. Labores Técnicas Principales
                  </h3>
                  <p>Tu labor técnica dentro de la plataforma se limita estrictamente a la gestión de expedientes y planimetría de socios:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1.5 text-slate-500 font-medium">
                    <li>Ir a campo a tomar puntos de coordenadas con el GPS de precisión.</li>
                    <li>Utilizar las mediciones para elaborar en gabinete los planos y las memorias.</li>
                    <li>Cargar dichos archivos al expediente digital de cada socio en el dashboard.</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" /> Registro de Asistencia (Jornada)
                  </h3>
                  <p>Ingresa al módulo **Jornada** en el menú izquierdo. Cuentas con 4 botones de acción diaria:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <span className="font-black text-primary text-xs uppercase block mb-1">Entrada y Salida</span>
                      <p className="text-xs text-slate-500">
                        Haz clic en **Marcar Entrada** al ingresar (ventana regular de 09:20 a 09:45) o **Marcar Salida** al retirarte (de 18:20 a 18:40). Si marcas fuera de estas ventanas, el sistema bloqueará la acción hasta que escribas una justificación obligatoria.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <span className="font-black text-[#4892CC] text-xs uppercase block mb-1">Refrigerio</span>
                      <p className="text-xs text-slate-500">
                        Haz clic en **Iniciar Almuerzo** para pausar temporalmente tu jornada laboral y presiona **Finalizar Almuerzo** al reincorporarte para reanudar el conteo de horas.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-slate-400" /> Registro y Edición de Socios (Padrones)
                  </h3>
                  <p>Ve a **Socios / Titulares** y presiona **Registrar Socio** para dar de alta perfiles en el dashboard:</p>
                  <ul className="list-decimal pl-5 space-y-2.5 font-medium text-slate-500">
                    <li>
                      <span className="text-slate-800 font-bold">Autocompletado DNI:</span> Digita el DNI del socio y presiona Tab. Los datos oficiales de identidad se rellenarán automáticamente. <span className="text-amber-600 font-bold">Acción requerida:</span> Corrobora siempre visualmente que correspondan con los del titular físico.
                    </li>
                    <li>
                      <span className="text-slate-800 font-bold">Localidad y Vivienda:</span> Selecciona la localidad del socio. Esto auto-completa el Distrito, Provincia y Región de su domicilio. Solo debes digitar manualmente la **Dirección exacta**.
                    </li>
                    <li>
                      <span className="text-slate-800 font-bold">Manzanas y Lotes:</span> La manzana y lote son opcionales. Si se dispone de estos datos físicos en campo, debes ingresarlos.
                    </li>
                    <li>
                      <span className="text-slate-800 font-bold">Socios de Extrema Pobreza:</span> No realizan aportaciones económicas. Sin embargo, para registrarlos en el padrón del dashboard, debes generarles un recibo con **monto de S/. 0.00** en el sistema.
                    </li>
                    <li>
                      <span className="text-slate-800 font-bold">Observación Administrativa:</span> Si faltan constancias de posesión o el socio está duplicado, activa la casilla **Socio Observado** e ingresa la justificación detallada de forma obligatoria.
                    </li>
                    <li>
                      <span className="text-slate-800 font-bold">Observación de Pagos:</span> Solo ante cobros duplicados o transferencias Yape dirigidas erróneamente a otras personas, marca **Pago Observado** con sus detalles correspondientes para su posterior saneamiento.
                    </li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-slate-400" /> Expediente Digital y Subida de Planos
                  </h3>
                  <p>En el módulo **Expedientes Digitales**, puedes buscar por DNI, Nombre o manzana y lote (ej: *"mz H lt 15"*). Las localidades se filtran según el distrito seleccionado.</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Subir archivos:** En la fila del socio, haz clic en **+ Planos** o **+ Memoria** para cargar PDFs o imágenes de la planimetría.</li>
                    <li>**Marcar Medición:** Activa el switch **Lote Medido** individualmente o selecciona varios socios y presiona **Acciones -> Marcar como Medido**.</li>
                    <li>**Qué NO hacer:** No puedes desactivar el switch de Lote Medido si el socio ya tiene planos o memorias subidos en el sistema.</li>
                    <li>**Anular Archivos:** Si subiste un archivo erróneo, presiona el botón **Eliminar** (Tacho rojo) e ingresa una justificación obligatoria. El archivo no desaparecerá hasta que el Administrador apruebe la solicitud de anulación.</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-slate-400" /> Rendición de Egresos y Presupuestos
                  </h3>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Solicitud de Fondos:** Ve a **Presupuestos**, presiona **Solicitar Fondos**, ingresa motivo y monto estimado y presiona enviar. Entrará como *Pendiente* y no se usará hasta que el administrador lo autorice.</li>
                    <li>**Registrar Gasto:** Ve a **Gastos**, haz clic en **Registrar Gasto** e ingresa el monto positivo. Si gastas del dinero transferido por la empresa, abre el selector **Vincular a Presupuesto** y elige tu presupuesto aprobado (Modalidad A). Si es un gasto reembolsable de tu propio bolsillo, déjalo en **"Ninguno"** (Modalidad B).</li>
                    <li>**Sustentar:** Sube el comprobante digital o presiona la casilla **Declaración Jurada** si el local no emite boleta formal.</li>
                    <li>**Tipos de Comprobante:** Ten en cuenta que existen **Recibos Físicos** antiguos (comprobantes manuales previos que sirven de sustento válido) y **Recibos Virtuales** digitales generados por la plataforma.</li>
                  </ul>
                </section>
              </div>
            </Card>
          </TabsContent>

          {/* CONTENIDO: FINANZAS */}
          <TabsContent value="finanzas" className="space-y-6 focus-visible:outline-none">
            <Card className="rounded-3xl border-none shadow-premium bg-white p-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 border-b pb-4 mb-6 uppercase tracking-tight">
                <Wallet className="w-6 h-6 text-primary" />
                Manual Operativo del Área de Finanzas en el Dashboard
              </h2>

              <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
                <section className="space-y-3">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-slate-400" /> Registro de Aportaciones (Ingresos)
                  </h3>
                  <p>Ingresa a la sección **Ingresos** y presiona **Registrar Ingreso**:</p>
                  <ul className="list-disc pl-5 space-y-2.5 font-medium text-slate-500">
                    <li>Busca al socio por su DNI o Nombre en la barra de búsqueda emergente.</li>
                    <li>Registra el Monto, Fecha, Cuenta receptora, Método de pago y Código de Operación Bancaria.</li>
                    <li>
                      <span className="text-slate-800 font-bold">Extrema Pobreza:</span> Si el socio califica en Extrema Pobreza, no aporta fondos. Para regularizar su padrón, registra obligatoriamente el ingreso con **Monto: 0.00** para emitir un recibo con valor cero sin descuadrar la caja.
                    </li>
                    <li>
                      <span className="text-slate-800 font-bold">Descarga PDF:</span> Al guardar el ingreso, el sistema generará de forma automática el correlativo de recibo y abrirá el visor PDF para imprimir o guardar el comprobante contable.
                    </li>
                    <li>
                      <span className="text-slate-800 font-bold">Revertir Errores:</span> Si digitaste mal un cobro, ubica la fila en la tabla, haz clic en **Eliminar** (Tacho rojo) y detalla la justificación. Esto creará una solicitud de anulación contable pendiente de aprobación del Administrador.
                    </li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-slate-400" /> Conciliaciones y Cierres de Cuentas
                  </h3>
                  <p>Ingresa al módulo **Cuentas**:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Filtros de Análisis:** Cambia el rango de tiempo del gráfico superior entre *Día, Mes, Trimestre o Año* para evaluar flujos contables.</li>
                    <li>**Conciliación:** Abre los selectores de tipo de cuenta y nombres de cuenta para contrastar la tabla del historial unificado frente a tus estados de cuenta bancarios.</li>
                    <li>**Cierre de Caja:** Utiliza el buscador de la tabla para aislar cobros de socios o números de operación, y haz clic en **Reporte PDF (Cierre)** para descargar el cierre consolidado en formato PDF.</li>
                    <li>**Gastos Directos Administrativos:** Haz clic en el botón **Nuevo Movimiento** de esta pantalla. Si registras gastos y los clasificas como *Gasto Fijo* o subcategoría *Sueldo*, el dinero se deducirá de la cuenta corriente de forma automática sin pasar por la bandeja de aprobaciones del administrador.</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-400" /> Facturación y Resúmenes Diarios (SUNAT)
                  </h3>
                  <p>Módulo de facturas y boletas electrónicas de venta:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Exportar:** Ingresa al módulo de **Facturación** para revisar boletas, facturas o notas de crédito y exporta las planillas mensuales en Excel para contabilidad externa.</li>
                    <li>**Declaraciones del Día:** Ve a **Resúmenes Diarios**. Selecciona la fecha en el calendario y presiona **Generar Resumen del Día** para compilar las boletas simplificadas.</li>
                    <li>**Envío a SUNAT:** Revisa el cuadro y presiona **Enviar Resumen a SUNAT**. Se transmitirá y asignará un Ticket. Monitorea el estado final de la declaración en la tabla inferior del historial (*Aceptado, Rechazado o Pendiente*).</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-slate-400" /> Aprobación de Egresos de Ingenieros
                  </h3>
                  <p>Módulo de **Aprobaciones Pendientes** (Egresos y Viáticos):</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>Audita las rendiciones y compras de los ingenieros listadas en la bandeja.</li>
                    <li>Haz clic en **Ver Comprobante** para cotejar el monto y datos de la boleta digital adjunta o la Declaración Jurada.</li>
                    <li>Haz clic en **Aprobar** para registrar el egreso y descontar el saldo del presupuesto operativo del ingeniero, o haz clic en **Rechazar**.</li>
                  </ul>
                </section>
              </div>
            </Card>
          </TabsContent>

          {/* CONTENIDO: ADMINISTRADOR */}
          <TabsContent value="admin" className="space-y-6 focus-visible:outline-none">
            <Card className="rounded-3xl border-none shadow-premium bg-white p-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 border-b pb-4 mb-6 uppercase tracking-tight">
                <Shield className="w-6 h-6 text-primary" />
                Manual Operativo del Administrador en el Dashboard
              </h2>

              <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
                <section className="space-y-3">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-slate-400" /> Configuración Global y Roles
                  </h3>
                  <p>Accede al panel de **Configuración**:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Horarios de Asistencia:** En la pestaña *Horarios*, digita las ventanas horarias de entrada y salida vigentes de la empresa. Presiona *Guardar* para actualizar las tolerancias automáticas.</li>
                    <li>**Permisos Modulares (Equipo):** En la pestaña *Equipo*, selecciona al colaborador y activa o desactiva de forma individual las casillas de accesos especiales (*Facturación Exclusiva*, *Encargado de Inventario*, *Administrador de Jornada*, *Gestor Financiero*, o lectura de *Ingresos/Gastos/Cuentas*).</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-slate-400" /> Aprobación y Cierre de Presupuestos
                  </h3>
                  <p>En el módulo **Presupuestos**:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Autorizar Solicitudes:** Ubica los presupuestos *Pendientes* solicitados por ingenieros y haz clic en **Aprobar**. Define el Monto Aprobado definitivo y añade notas de la transferencia antes de confirmar.</li>
                    <li>**Rechazar:** Presiona *Rechazar* e ingresa la justificación del descarte.</li>
                    <li>**Liquidación:** Presiona el botón **Cerrar Presupuesto** cuando el saldo del ingeniero por rendir cuadre con los consumos verificados para archivarlo.</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-slate-400" /> Procesamiento de Solicitudes en Bandeja de Aprobaciones
                  </h3>
                  <p>Bandeja centralizada de **Aprobaciones Pendientes**:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Aprobación de Gastos:** Audita gastos de ingenieros, haz clic en *Ver Comprobante* o evalúa Declaraciones Juradas, y presiona *Aprobar* para debitar el dinero de caja chica y cuadrar el presupuesto vinculado.</li>
                    <li>**Anulación de Transacciones (Borrados Administrativos):** Evalúa las solicitudes de anulación de ingresos o egresos por fallos de digitación. Haz clic en **Aprobar** para anular la transacción de forma administrativa (ocultándola del dashboard principal y recalculando balances).</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-slate-400" /> Aprobación de Eliminación de Documentos
                  </h3>
                  <p>En el panel de expedientes de socios:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>Ingresa a la pestaña **Solicitudes de Eliminación** (solo visible para Administradores).</li>
                    <li>Revisa la carpeta del socio y la justificación dada por el ingeniero de campo.</li>
                    <li>Haz clic en **Aprobar** para borrar físicamente el archivo del servidor en la nube y remover la URL del expediente del socio.</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-400" /> Auditoría Inmutable del Sistema
                  </h3>
                  <p>En la sección **Auditoría** (menú izquierdo):</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>Monitorea el log inalterable de inserciones, actualizaciones y eliminaciones de registros en el sistema.</li>
                    <li>Haz clic en **Inspeccionar** para abrir un modal con la comparativa en formato JSON de cómo estaba la información antes (*Datos Anteriores*) y cómo quedó guardada (*Datos Nuevos*).</li>
                    <li>Usa el botón **Exportar Logs** para descargar la lista filtrada directamente en Excel.</li>
                  </ul>
                </section>
              </div>
            </Card>
          </TabsContent>

          {/* CONTENIDO: INVENTARIO */}
          <TabsContent value="inventario" className="space-y-6 focus-visible:outline-none">
            <Card className="rounded-3xl border-none shadow-premium bg-[#FAFBFC] border border-slate-200/60 p-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 border-b pb-4 mb-6 uppercase tracking-tight">
                <Package className="w-6 h-6 text-[#4892CC]" />
                Manual Operativo del Encargado de Inventario en el Dashboard
              </h2>

              <div className="space-y-8 text-slate-600 leading-relaxed text-sm md:text-base">
                <section className="space-y-3">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-400" /> Gestión del Catálogo de Herramientas
                  </h3>
                  <p>Módulo de control de existencias de activos de campo:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>**Añadir Item:** En la pestaña *Catálogo*, haz clic en el botón **Nuevo Equipo**. Digita el nombre (ej. *Drone Topográfico*), observaciones o detalles opcionales, y el stock inicial. Presiona *Guardar*. El sistema inicializará el Stock Total y el Stock Disponible.</li>
                    <li>**Eliminar Item:** Si deseas dar de baja del catálogo un equipo por daño total o pérdida, posiciona el cursor sobre la tarjeta en el panel de catálogo y presiona el botón **Eliminar** (Tacho rojo) para ocultarlo del sistema.</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-slate-400" /> Registro de Salidas de Equipos (Checkout)
                  </h3>
                  <p>Registra la entrega de herramientas antes de que el personal técnico salga a campo:</p>
                  <ul className="list-disc pl-5 space-y-2.5 text-slate-500 font-medium">
                    <li>Haz clic en el botón **Registrar Salida** (esquina superior derecha).</li>
                    <li>**Selecciona Colaborador:** Elige de la lista al Ingeniero o técnico responsable de la custodia.</li>
                    <li>**Salida Multi-ítem:** Selecciona la herramienta, digita la cantidad entregada, e introduce observaciones si es necesario (ej: *"Se entrega calibrado y con maletín"*). Si lleva más herramientas, haz clic en **+ Agregar otro equipo** para añadir más filas.</li>
                    <li>**Confirmar:** Presiona **Confirmar Salida**. El sistema aplicará un bloqueo de seguridad automático para prevenir que otros operadores asignen el mismo stock disponible simultáneamente, descontará el stock disponible en el catálogo y generará las custodias activas a nombre del colaborador.</li>
                  </ul>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <ArrowDownCircle className="w-5 h-5 text-slate-400" /> Recepción y Retorno de Equipos (Checkin)
                  </h3>
                  <p>Al regresar de la obra, debes recepcionar los activos en el sistema para descargar las responsabilidades del ingeniero:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="font-black text-slate-800 text-xs uppercase block mb-1">Recepción Individual</span>
                      <p className="text-xs text-slate-500">
                        Ve a la pestaña **Equipos en Campo**, busca al ingeniero y la herramienta que entrega, y presiona el botón **Devolver**. El sistema cerrará la asignación agregando la marca temporal de devolución y devolverá las unidades al stock disponible.
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="font-black text-slate-800 text-xs uppercase block mb-1">Recepción Total (Masiva)</span>
                      <p className="text-xs text-slate-500">
                        Si el ingeniero devuelve todos sus activos a la vez, haz clic en el botón **Recepción Total** (esquina superior derecha), selecciona al Colaborador, corrobora la lista en pantalla y presiona **Confirmar Devolución** para cerrar todas sus asignaciones simultáneamente.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-6">
                  <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-slate-400" /> Historial de Asignaciones
                  </h3>
                  <p>Ingresa a la pestaña **Historial** para auditar todos los movimientos de salida y retorno registrados en la plataforma:</p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-500 font-medium">
                    <li>Visualiza la tabla de movimientos y haz clic en las cabeceras para ordenar por fechas de salida, de retorno, nombres o estados.</li>
                    <li>Utiliza el filtro de texto para buscar movimientos específicos.</li>
                    <li>Visualiza si una asignación está *En Uso* (pendiente de retorno, resaltado en amarillo) o *Devuelto* (resaltado en verde).</li>
                  </ul>
                </section>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HelpPage;
