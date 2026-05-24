# Guía de Usuario: Ingeniero - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Ingeniero**. Esta guía exhaustiva detalla todas las herramientas, vistas y operaciones que tienes asignadas en el sistema de FIMAGADI. Su propósito es servir como manual operativo completo para el cumplimiento de tus labores diarias en campo y gabinete.

---

## 1. Módulo de Asistencia (Control de Jornada Laboral)

El sistema de FIMAGADI utiliza un control de asistencia de cuatro (4) marcaciones diarias, sincronizado directamente con la tabla de base de datos `registros_jornada` y los parámetros globales de la tabla `configuracion` (`horario_entrada` y `horario_salida`). 

### Procedimiento de Marcación Diaria:
Para registrar tu jornada, ingresa al módulo **Jornada** en el menú lateral:
1. **Marcación de Entrada (Inicio de Jornada):**
   * Haz clic en **Marcar Entrada**.
   * *Control de Tardanzas:* El sistema contrasta la hora actual con el límite superior establecido en `configuracion` (por defecto, la ventana es de 09:20 a 09:45). Si registras tu entrada después de la hora límite, el sistema bloqueará el guardado hasta que digites obligatoriamente una **Justificación** detallada en el campo `justificacion_inicio` e ingreses observaciones adicionales en `observaciones_inicio`.
2. **Marcación de Inicio de Almuerzo:**
   * Al tomar tu descanso, ingresa al módulo y haz clic en **Iniciar Almuerzo**. Esto guardará la marca temporal en la columna `hora_inicio_almuerzo`.
3. **Marcación de Fin de Almuerzo:**
   * Al retornar del descanso, haz clic en **Finalizar Almuerzo**. Esto registrará la marca temporal en `hora_fin_almuerzo`.
4. **Marcación de Salida (Fin de Jornada):**
   * Al concluir tus labores, ingresa y presiona **Marcar Salida**.
   * *Control de Salidas Anticipadas:* Si registras tu salida antes de la hora configurada (ventana por defecto de 18:20 a 18:40), deberás proveer una justificación formal en el campo `justificacion_fin` y añadir los detalles del retiro anticipado en `observaciones_fin` para la aprobación del Administrador.

---

## 2. Registro y Edición de Socios (Integración con RENIEC API)

Cuando realices empadronamientos o actualizaciones de titulares, utilizarás el formulario interactivo de registro de socios (`SocioTitularRegistrationForm.tsx`), el cual automatiza la captura de datos de identidad nacional.

### Búsqueda Automatizada por DNI (RENIEC):
1. Ve a la sección de **Socios / Titulares** y haz clic en **Registrar Socio** (o editar socio existente).
2. En la sección **Datos Personales**, ingresa el número de **DNI** de 8 dígitos y presiona la tecla Tab o haz clic fuera del campo (evento *onBlur*).
3. **Flujo de Consulta Externa (RPC):** El sistema invocará de forma automática el servicio local `/api/reniec` y la función atómica de Supabase `consultar_dni_externo` para recuperar la información del registro oficial.
4. **Campos Auto-completados (Inmutables temporalmente en el formulario):**
   * Nombres completos.
   * Apellido Paterno y Apellido Materno (el sistema separa automáticamente apellidos compuestos o partículas como "DE", "DEL", "LA").
   * Fecha de Nacimiento (e inicializa la edad del socio de forma automática en la columna `edad` mediante el cálculo de diferencia de años).
   * Dirección DNI, Región DNI, Provincia DNI y Distrito DNI.
5. **Completado de Datos de Campo:** Deberás rellenar manualmente la sección **Datos de Vivienda** que incluye:
   * Dirección de Vivienda física actual.
   * Localidad (cuenta con un combobox autocompletable con base en localidades ya registradas en la tabla `localidad_codigos`).
   * Manzana (Mz) y Lote (Lt) físicos.
   * Situación Económica (categorías requeridas: *Pobre* o *Extremo Pobre*).
6. **Observaciones Especiales:** 
   * **Observación Administrativa (`isObservado`):** Si marcas esta opción por irregularidades documentarias, deberás registrar obligatoriamente una justificación detallada.
   * **Observación Financiera (`isPaymentObserved`):** Si el pago de aportes del socio presenta discrepancias, actívalo y rellena de forma obligatoria el campo `paymentObservationDetail`.

---

## 3. Expediente Digital y Carga de Planos

El módulo **Expedientes Digitales** (`PartnerDocuments.tsx`) es el núcleo del control técnico de lotes y planimetría.

### Herramientas de Filtrado y Búsqueda:
* **Filtros por Jurisdicción:** Puedes filtrar los expedientes utilizando el selector de **Distrito**. Al cambiar de distrito, el selector de **Localidad** se reiniciará de manera inteligente para evitar combinaciones vacías.
* **Búsqueda Avanzada:** El buscador soporta comandos rápidos de manzana y lote. Por ejemplo, al digitar *"mz A lt 15"* o *"manzana H lote 4"*, el sistema extraerá los términos y filtrará directamente las columnas correspondientes en la tabla.

### Gestión Documental y Medición de Lotes:
* **Estado de Ingeniería (`is_lote_medido`):** Indica si un lote físico ha sido medido topográficamente. Puedes activarlo de forma individual en la fila del socio, o realizar una actualización masiva seleccionando múltiples socios y haciendo clic en **Acciones -> Marcar como Medido**.
* **Tipos de Documentos Permitidos:** El sistema te permite subir documentos bajo las siguientes clasificaciones oficiales:
  1. *Planos de ubicación* (Almacenados en el bucket de storage `planos`).
  2. *Memoria descriptiva* (Almacenados en el bucket de storage `memoria-descriptiva`).
  3. *Ficha*, *Contrato* y *Comprobante de Pago* (Almacenados en el bucket de storage `documents`).
* **Regla de Consistencia:** No podrás desmarcar el estado de "Lote Medido" (`is_lote_medido = false`) de un socio si ya se han subido y existen sus "Planos de ubicación" o su "Memoria descriptiva" en el sistema.

### Workflow de Eliminación de Documentos (Cola de Aprobaciones):
Como Ingeniero de campo, no posees permisos de borrado físico directo. Si subes un archivo erróneo y deseas eliminarlo:
1. Haz clic en el ícono de **Eliminar** (Tacho rojo) en el comprobante o plano correspondiente.
2. Escribe una **Justificación** clara del motivo del borrado en el cuadro de diálogo.
3. Al confirmar, el sistema creará un registro en la tabla `document_deletion_requests` con estado `'Pending'`.
4. El Administrador recibirá una alerta automática en su panel para evaluar, aprobar o rechazar tu solicitud. El documento se eliminará únicamente cuando el Administrador dé el visto bueno.

---

## 4. Consulta de Cajas de Archivo Físico (`cajas_archivo`)

Para complementar el expediente digital, la empresa utiliza una infraestructura física de organización. Puedes verificar en qué contenedor de archivo real se encuentra la documentación original de un socio:
* Consulta las columnas de archivado en la vista de socios para conocer:
  * **Número de Caja (`numero_caja`):** El número asignado al archivador físico.
  * **Año de Expediente (`anio_expediente`):** Año correspondiente a la carpeta.
  * **Código de Etiqueta (`codigo_etiqueta`):** El código alfanumérico único adherido a la caja.
  * **Código QR (`qr_uuid`):** Código de identificación rápida para escaneo físico en almacén.

---

## 5. Solicitud de Fondos y Rendición de Gastos

El sistema interactúa de forma estrecha con la tabla `presupuestos_operativos` y la tabla `gastos` (donde los egresos se registran contablemente con valores negativos).

### Flujo de Trabajo Financiero:
1. **Solicitud de Presupuesto:**
   * Ingresa a **Presupuestos** y haz clic en **Solicitar Fondos**.
   * Especifica el **Motivo** (ej. *"Viáticos para levantamiento en Localidad X"*) y el **Monto Estimado** en Soles.
   * Espera la aprobación del Administrador, quien definirá el monto definitivo a transferirte.
2. **Rendición de Gastos (Modalidad A - Vinculado a Presupuesto):**
   * Al realizar consumos con el presupuesto aprobado, ve a **Gastos** y haz clic en **Registrar Gasto**.
   * Rellena el Monto, Fecha, Categoría (Viáticos, Gasto Fijo u Otros) y Descripción.
   * En el selector **"Vincular a Presupuesto"**, elige el código de tu presupuesto aprobado.
   * Al guardar, el sistema restará automáticamente el monto del saldo por rendir de ese presupuesto (ejecutando la función `updateMontoRendido` en la base de datos).
3. **Registro de Gastos Generales (Modalidad B - Sin Presupuesto / Reembolsable):**
   * Si realizaste un gasto con tus propios fondos o requieres un egreso directo no planificado, registra el gasto normalmente pero marca **"Vincular a Presupuesto"** como **"Ninguno"**.
   * Este egreso se guardará como una solicitud en `approval_requests` con el tipo `expense_approval` en estado `'pending'`. Será procesado por Finanzas o el Administrador para su aprobación y posterior reembolso.
4. **Soporte Físico (Comprobante / Declaración Jurada):**
   * Si tienes comprobante, sube el archivo (imagen o PDF). El archivo se guardará bajo una ruta única `receipts/${Date.now()}_nombre` en el bucket de storage.
   * Si el establecimiento de campo no emite comprobantes formales, marca el check **"Gasto sin comprobante (Declaración Jurada)"**. Esto creará un sustento digital bajo tu firma de responsabilidad.

---

## 6. Custodia de Equipos de Trabajo (Inventario)

En la sección **Inventario**, puedes ver el listado de herramientas técnicas asignadas a tu cargo para las labores de campo (ej. GPS, laptops de obra, drones, winchas métricas).
* **Custodia Activa:** Toda asignación generada a tu nombre se almacena en la tabla `inventory_assignments` con estado `'En Uso'`.
* **Responsabilidad:** Eres el responsable de los activos listados en tu panel. Al entregar las herramientas de vuelta en el almacén, exige al **Encargado de Inventario** que registre la devolución en el sistema para que se actualice la fecha de retorno (`returned_at`), se anule la custodia activa y las herramientas vuelvan al stock disponible del catálogo central.
