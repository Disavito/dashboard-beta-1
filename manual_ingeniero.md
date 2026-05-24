# Guía de Usuario: Ingeniero - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Ingeniero**. Esta guía detalla de manera exhaustiva las herramientas, flujos de trabajo y operaciones que tienes asignadas en la plataforma FIMAGADI para registrar tu asistencia, solicitar y rendir fondos, gestionar expedientes de socios y controlar las herramientas a tu cargo.

---

## 1. Módulo de Asistencia (Marcaciones de Jornada)

El sistema de FIMAGADI utiliza un control de asistencia de cuatro (4) marcaciones obligatorias al día para llevar un seguimiento de tu jornada. Tus registros se evalúan de forma automática de acuerdo con las políticas de horario de la empresa:

### Procedimiento para el Marcado Diario:
1. **Registro de Entrada (Inicio de Jornada):**
   * Al iniciar el día laboral, ve al módulo **Jornada** en el menú lateral y presiona **Marcar Entrada**.
   * *Control de Tardanzas:* Si realizas la marcación después del horario establecido (la ventana estándar de ingreso es de 09:20 a 09:45), el sistema te pedirá obligatoriamente ingresar una **Justificación** detallada y observaciones antes de guardar la marca.
2. **Registro de Inicio de Almuerzo:**
   * Al iniciar tu descanso para comer, ingresa al módulo y presiona **Iniciar Almuerzo**.
3. **Registro de Fin de Almuerzo:**
   * Al retornar de tu almuerzo, presiona **Finalizar Almuerzo**.
4. **Registro de Salida (Fin de Jornada):**
   * Al concluir tus labores del día, presiona **Marcar Salida**.
   * *Control de Salidas Anticipadas:* Si marcas tu salida antes del horario de salida configurado (ventana estándar de 18:20 a 18:40), deberás registrar de forma obligatoria una justificación antes de que se grabe tu marca.

---

## 2. Registro y Edición de Socios (Consulta de Identidad por DNI)

Cuando realices el empadronamiento de nuevos socios o modifiques los datos de titulares existentes, contarás con una herramienta de consulta automática conectada con el servicio nacional de identidad.

### Procedimiento de Búsqueda y Auto-completado:
1. Abre el formulario para **Registrar Socio** o editar uno existente.
2. Digita el número de **DNI** del socio (8 dígitos) y haz clic fuera del campo o presiona la tecla Tab.
3. El sistema buscará los datos de inmediato y auto-completará los siguientes campos:
   * Nombres completos.
   * Apellido Paterno y Apellido Materno (el sistema separa de manera inteligente apellidos compuestos o palabras como "DE", "DEL", "LA").
   * Fecha de Nacimiento (y calcula automáticamente la edad actual del socio).
   * Dirección oficial de su documento de identidad, Región, Provincia y Distrito de origen.
4. **Completado Manual de Datos de Campo:** Deberás rellenar a mano los datos de su vivienda actual en la zona de trabajo:
   * Dirección física del domicilio en el proyecto.
   * Localidad (el sistema te ofrece sugerencias automáticas de localidades válidas de la zona).
   * Manzana (Mz) y Lote (Lt) asignados.
   * Situación Económica (*Pobre* o *Extremo Pobre*).
5. **Indicadores de Alerta en Socios:**
   * **Observado Administrativo:** Si el socio presenta problemas con sus carpetas o información general, activa esta opción e ingresa una descripción obligatoria del problema.
   * **Pago Observado:** Si existen inconsistencias en sus cuotas o recibos de aportaciones, activa esta opción y detalla el motivo financiero de forma obligatoria.

---

## 3. Expediente Digital de Socios y Carga de Documentos

El módulo de expedientes te permite administrar los documentos técnicos de cada lote y actualizar el avance de ingeniería en campo.

### Búsqueda y Filtrado:
* **Filtros por Zona:** Puedes segmentar a los socios seleccionando el **Distrito**. Al cambiar este campo, el filtro de **Localidad** se reiniciará automáticamente para que no queden combinaciones vacías.
* **Búsqueda por Manzana y Lote:** El buscador te permite buscar combinaciones específicas como *"mz B lt 5"* o *"manzana F lote 12"*. El sistema interpretará el comando y aislará la manzana y lote correspondientes de forma inmediata.

### Gestión de Avance y Archivos:
* **Lote Medido (Estado de Ingeniería):** Indica si ya se realizaron las mediciones topográficas del lote. Puedes activarlo de forma individual en la tabla o de forma masiva seleccionando a varios socios y haciendo clic en **Acciones -> Marcar como Medido**.
* **Tipos de Documentos y Reglas:** Puedes subir archivos PDF o imágenes correspondientes a:
  1. *Planos de ubicación*
  2. *Memoria descriptiva*
  3. *Ficha de empadronamiento*
  4. *Contrato firmado*
  5. *Comprobante de Pago*
* **Regla de Consistencia:** Para evitar inconsistencias de información, el sistema bloqueará e impedirá que desmarques un lote como "Medido" si este ya cuenta con planos de ubicación o memorias descriptivas cargadas en su expediente digital.

### Solicitud de Eliminación de Documentos (Bandeja de Aprobación):
Si subes un archivo equivocado y necesitas eliminarlo de un expediente:
1. Haz clic en el botón de **Eliminar** (Tacho rojo) al costado del archivo.
2. Ingresa de forma obligatoria una **Justificación** de la anulación.
3. El sistema no borrará el archivo de inmediato; en su lugar, enviará una solicitud al Administrador. El archivo se borrará permanentemente solo cuando el Administrador autorice tu solicitud.

---

## 4. Consulta de Cajas de Archivo Físico

Para respaldar el expediente digital, la empresa almacena los documentos impresos originales en cajas numeradas. Desde la ficha de cada socio, puedes consultar los datos de su archivador real:
* **Número de Caja:** El número del contenedor físico donde se archivó su carpeta.
* **Año de Expediente:** El año correspondiente a sus trámites.
* **Código de Etiqueta:** El identificador alfanumérico visible en el lomo de la caja.
* **Código QR:** Identificador único para el escaneo e inventario rápido de carpetas físicas en el almacén.

---

## 5. Solicitud de Fondos y Rendición de Gastos

El sistema te permite financiar tus traslados a obras o compras menores en campo, y reportar tus consumos directamente a contabilidad:

1. **Solicitar Presupuesto:**
   * Ve a la sección **Presupuestos** y haz clic en **Solicitar Fondos**.
   * Ingresa el **Motivo** del viaje o compra y el **Monto Estimado** que necesitas.
   * La solicitud pasará a evaluación de la administración, quienes te asignarán el monto definitivo a utilizar.
2. **Rendición de Gastos Vinculados (Modalidad A):**
   * Cuando realices compras utilizando el presupuesto que la administración ya te aprobó y transfirió previamente, ve a **Gastos** e introduce un nuevo registro.
   * Rellena el formulario con el monto, la fecha, el concepto y selecciona el **Presupuesto Vinculado** correspondiente. Esto restará de forma automática el gasto de tu saldo pendiente por justificar.
3. **Rendición de Gastos Reembolsables / Directos (Modalidad B):**
   * Si realizaste un gasto no presupuestado de tu propio dinero (reembolsable) o solicitas la compra de un artículo no contemplado en un presupuesto de viaje, llena el formulario de gastos y deja el selector de presupuesto en **"Ninguno"**.
   * Este gasto se enviará a la bandeja de pendientes del Administrador y se programará para su reembolso una vez que sea aprobado.
4. **Comprobantes y Declaraciones Juradas:**
   * **Con Sustento:** Sube una fotografía o archivo digital del comprobante (boleta o factura).
   * **Sin Sustento (Declaración Jurada):** Si el establecimiento local no emite comprobantes válidos (ej. transporte local o alimentación en zonas alejadas), marca el casillero de **Declaración Jurada**. Esto creará un sustento digital de responsabilidad bajo tu firma para consideración de la administración.

---

## 6. Inventario y Custodia de Herramientas de Campo

En el módulo **Inventario** puedes monitorear todos los dispositivos técnicos y consumibles que la empresa te ha entregado para tus labores diarias (ej. GPS de precisión, drones, equipos de seguridad, chalecos, laptops de campo).
* **Custodia Activa:** Visualiza la lista de equipos asignados bajo tu nombre en el panel derecho.
* **Devolución de Equipos:** Al regresar a la oficina, debes entregar físicamente las herramientas al encargado y asegurarte de que este registre la recepción en la plataforma. Tu estado de responsabilidad solo se liberará cuando el encargado confirme la devolución y la fecha de entrega quede registrada en el sistema.
