# Guía de Usuario en el Dashboard: Ingeniero - FIMAGADI

Bienvenido al manual operativo de usuario para el perfil de **Ingeniero**. Este documento detalla de manera exhaustiva el funcionamiento del **Dashboard de FIMAGADI**, indicando a qué secciones debes ingresar, qué botones debes presionar, qué información registrar, qué errores evitar y cómo gestionar solicitudes y autorizaciones dentro del sistema.

---

## 1. Módulo de Asistencia (Jornada)

Esta sección permite registrar las marcas de tiempo de tu horario diario en la plataforma:

* **Dónde ir:** En el menú lateral izquierdo, haz clic en **Jornada**.
* **Marcación de Entrada:**
  * **Qué hacer:** Al iniciar tus labores diarias, haz clic en el botón **Marcar Entrada**.
  * **Qué ocurre:** El sistema registrará la hora actual del servidor. Si registras tu entrada después de la hora permitida (el rango estándar es de 09:20 a 09:45), el sistema abrirá automáticamente una ventana emergente exigiendo que digites una **Justificación** de la tardanza y observaciones adicionales antes de permitirte guardar el registro.
* **Marcaciones de Almuerzo:**
  * **Qué hacer:** Al salir a comer, ingresa al módulo y presiona **Iniciar Almuerzo**. Al regresar de almorzar, ingresa y presiona **Finalizar Almuerzo**.
  * **Qué ocurre:** Se graban las marcas de tiempo correspondientes, deteniendo y reanudando el conteo de horas de trabajo.
* **Marcación de Salida:**
  * **Qué hacer:** Al finalizar tu día laboral, presiona **Marcar Salida**.
  * **Qué ocurre:** Si realizas esta marcación antes del horario regular (la ventana estándar es de 18:20 a 18:40), el sistema bloqueará el guardado hasta que ingreses de forma obligatoria una justificación por salida anticipada.

---

## 2. Módulo de Registro y Edición de Socios (Padrones)

Esta sección permite ingresar nuevos titulares de lotes al padrón general y corroborar sus datos oficiales:

* **Dónde ir:** En el menú lateral, haz clic en **Socios / Titulares** y presiona **Registrar Socio** (o el botón de edición en la fila de un socio existente).
* **Búsqueda por DNI (Auto-rellenado):**
  * **Qué hacer:** En la pestaña **Datos Personales**, escribe el número de **DNI** (8 dígitos) y haz clic en cualquier otra parte de la pantalla o presiona la tecla Tab.
  * **Qué ocurre:** El sistema inicia una consulta automática y rellenará por ti los campos de nombres, apellidos, fecha de nacimiento, edad, y la dirección de procedencia del DNI.
  * **Acción obligatoria:** Debes verificar visualmente en pantalla que los datos auto-completados coincidan exactamente con la identidad real del socio antes de continuar.
* **Datos de Vivienda y Autocompletado de Ubicación:**
  * **Qué hacer:** Selecciona la **Localidad** del socio en la lista desplegable de la pestaña personal.
  * **Qué ocurre:** El sistema asignará automáticamente el Distrito, Provincia y Región en la pestaña de datos de vivienda.
  * **Acción obligatoria:** Solo debes escribir manualmente la **Dirección** física exacta de su vivienda.
  * **Manzana (Mz) y Lote (Lt):** El llenado de la manzana y lote es opcional en el formulario; sin embargo, si dispones de estos datos, debes escribirlos obligatoriamente.
* **Marcación de Casos Especiales (Observaciones):**
  * **Socio Observado (Administrativo):** Si al socio le falta presentar su constancia de posesión original, si está duplicado en el sistema o tiene cualquier problema de documentación, activa la casilla **Marcar como Socio Observado** e ingresa la justificación detallada en el cuadro de texto que se habilitará de forma obligatoria.
  * **Pago Observado (Financiero):** Si detectas problemas específicos con sus pagos (por ejemplo, si el comprobante de pago está duplicado, o si el Yape se depositó por error a otra persona), activa la casilla **Marcar Pago Observado** e ingresa los detalles del problema de forma obligatoria para su posterior rectificación.
  * **Extrema Pobreza:** Si el socio califica bajo esta condición, el sistema no registrará un pago en efectivo, pero es obligatorio que generes un **recibo con monto de S/. 0.00** en el módulo correspondiente para que el socio quede registrado como activo en el padrón del dashboard.

---

## 3. Módulo de Expedientes Digitales (Documentos)

En esta sección realizas la carga y organización digital de los entregables técnicos de los socios (planos y memorias descriptivas que elaboras a partir de las mediciones y puntos GPS tomados en campo):

* **Dónde ir:** En el menú lateral, haz clic en **Expedientes Digitales** (o **Documentos**).
* **Filtros y Búsqueda Eficiente:**
  * Puedes buscar a cualquier socio ingresando en el buscador su DNI, nombres, manzana o lote (por ejemplo, digitando *"mz A lt 12"*).
  * Si utilizas los filtros desplegables de **Distrito**, el filtro de **Localidad** se reiniciará de manera automática para evitar combinaciones sin resultados.
* **Carga de Archivos de Ingeniería:**
  * **Qué hacer:** Ubica la fila del socio y haz clic en los botones **+ Planos** o **+ Memoria** (según corresponda).
  * **Qué ocurre:** Se abrirá un modal de carga. Arrastra el archivo (PDF o imagen) y presiona **Guardar**.
* **Estado de Ingeniería (Lote Medido):**
  * **Qué hacer:** Haz clic en la casilla de verificación individual en la columna *Ingeniería* para marcar un lote como medido. También puedes seleccionar múltiples filas y presionar **Acciones -> Marcar como Medido**.
  * **Qué NO hacer:** El sistema bloqueará y no te permitirá desmarcar la casilla de lote medido si el socio ya tiene archivos de planos de ubicación o memorias descriptivas subidos en el sistema.
* **Cómo Revertir o Eliminar un Archivo cargado:**
  * **Qué hacer:** Si subiste un plano o memoria incorrecto, presiona el botón **Eliminar** (Tacho rojo) al costado del archivo en el expediente del socio.
  * **Qué ocurre:** El sistema abrirá un diálogo exigiendo que digites una **Justificación** de la anulación. Al confirmar, el archivo **no** desaparecerá del dashboard de inmediato; se enviará una solicitud al Administrador. El archivo se borrará del sistema únicamente cuando el Administrador apruebe la solicitud en su bandeja.

---

## 4. Módulo de Presupuestos (Solicitud de Fondos de Campo)

Antes de realizar salidas a campo, debes solicitar los fondos operativos a través de la plataforma:

* **Dónde ir:** Haz clic en **Presupuestos** en el menú izquierdo.
* **Cómo Solicitar Fondos:**
  * **Qué hacer:** Haz clic en el botón **Solicitar Fondos** (esquina superior derecha).
  * **Qué registrar:** Escribe el **Motivo** detallado (ej. *"Viáticos de campo en Zona Norte"*) y el **Monto Estimado** solicitado en Soles. Presiona **Enviar Solicitud**.
  * **Qué ocurre:** La solicitud aparecerá listada en estado *Pendiente*. No podrás utilizar estos fondos hasta que el Administrador los evalúe y los apruebe (cambiando su estado a *Aprobado* y asignándote el saldo autorizado en el dashboard).

---

## 5. Módulo de Gastos (Rendición y Reembolsos)

Una vez que utilices dinero para las compras o consumos de campo, debes registrarlos en el sistema:

* **Dónde ir:** Haz clic en **Gastos** en el menú izquierdo.
* **Cómo Registrar un Gasto:**
  * **Qué hacer:** Haz clic en el botón **Registrar Gasto** y completa los campos: Monto (escribe el valor positivo, el sistema lo convertirá y almacenará internamente en negativo para restar de los balances), Fecha, Categoría y Descripción.
  * **Vincular a Presupuesto (Rendiciones - Modalidad A):** Si el dinero gastado proviene de los fondos que la administración ya te aprobó previamente, abre el selector **Vincular a Presupuesto** y elige el código del presupuesto aprobado. Al guardar, el sistema descontará automáticamente el monto de tu saldo por rendir de ese presupuesto.
  * **Gasto sin Presupuesto (Reembolsos / A solicitud - Modalidad B):** Si gastaste tu propio dinero o solicitas el pago de un concepto no planificado, deja el selector de presupuesto marcado como **"Ninguno"**.
* **Sustento del Gasto:**
  * Si tienes comprobante, carga la foto o PDF de la boleta/factura.
  * Si el comercio local no emite boletas, activa el casillero **Gasto sin comprobante (Declaración Jurada)**. Esto guardará el gasto bajo tu firma de responsabilidad.
* **Qué ocurre al guardar:**
  * Si registras un *Gasto Fijo* o *Sueldo*, el sistema lo marcará como auto-aprobado y lo consolidará de inmediato.
  * Si registras viáticos u otros conceptos generales, el gasto **no** aparecerá consolidado de inmediato; se enviará como solicitud a la bandeja de aprobaciones del Administrador/Finanzas. Verás reflejado el gasto en tu historial una vez que sea autorizado.

---

## 6. Módulo de Inventario (Consulta de Herramientas)

* **Dónde ir:** Haz clic en **Inventario**.
* **Cómo funciona:** Como ingeniero, esta es una pestaña de **solo lectura**. 
* **Qué verificar:** Revisa la lista de herramientas en custodia en el panel derecho de la pantalla. Si devuelves físicamente un GPS, laptop o dron, debes verificar en este panel que el encargado de almacén registre el retorno para que la herramienta desaparezca de tu lista de custodias activas del dashboard.
