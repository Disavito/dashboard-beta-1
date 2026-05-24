# Guía de Usuario: Finanzas - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Finanzas**. Como responsable del control contable y tesorería de la empresa, posees acceso a los módulos de ingresos, conciliación bancaria, facturación tributaria, emisión de comprobantes y resúmenes diarios para la Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT).

---

## 1. Registro de Aportaciones de Socios (Ingresos)

El módulo de **Ingresos** registra las aportaciones ordinarias y extraordinarias abonadas por los socios de la organización:

### Registrar Ingreso Individual:
1. Ingresa a la sección **Ingresos** y haz clic en **Registrar Ingreso**.
2. Escribe el número de DNI o Nombre del titular en el buscador. El sistema utilizará la consulta atómica de la base de datos para recuperar su información en tiempo real.
3. Rellena los datos obligatorios del formulario:
   * **Monto:** Ingresa el valor exacto recibido en Soles.
   * **Fecha:** Selecciona el día en que se hizo efectivo el cobro.
   * **Cuenta:** Selecciona la cuenta bancaria de destino (tabla `cuentas`).
   * **Tipo de Transacción:** Selecciona el canal de pago (ej. *Efectivo, Depósito, Transferencia*).
   * **Número de Operación (`numeroOperacion`):** Digita el número de comprobante bancario para control de conciliaciones.
4. **Emisión de Recibo Digital:** Al hacer clic en guardar, el sistema generará automáticamente un número de recibo correlativo único (`receipt_number`), escribirá el registro en la tabla `ingresos` y abrirá una ventana para descargar o imprimir el comprobante de pago en PDF.

---

## 2. Administración de Cuentas y Conciliación Bancaria

El módulo **Cuentas y Tesorería** (`Accounts.tsx`) es el visor de liquidez en tiempo real de FIMAGADI. Permite mantener control de las cuentas bancarias (BBVA, Efectivo, Caja Chica, etc.):

* **Análisis de Flujo:** En la parte superior, visualiza las gráficas analíticas comparando Ingresos versus Gastos. Puedes ajustar la escala de tiempo a *Día, Mes, Trimestre o Año*.
* **Conciliación Periódica:** 
  1. Verifica que los movimientos mostrados en la tabla del **Historial Unificado** coincidan exactamente con los extractos de tus cuentas bancarias reales.
  2. Cada ingreso y gasto registrado debe estar asociado a su respectiva cuenta en la columna `account` para reflejar el saldo neto disponible correcto.
* **Cierre de Caja y Reportes en PDF:**
  1. En el Historial Unificado, realiza búsquedas por socio o número de recibo para filtrar transacciones.
  2. Haz clic en el botón **Reporte PDF (Cierre)** para descargar de forma automática el archivo `Cierre_Caja_[fecha].pdf` que consolida todos los movimientos del periodo.

---

## 3. Emisión de Comprobantes y Facturación Electrónica

El sub-módulo de Facturación controla las obligaciones y facturas comerciales de la entidad:

* **Auditoría de Comprobantes:** Desde el panel de facturación, visualiza e inspecciona de forma independiente Facturas, Boletas de Venta y Notas de Crédito emitidas.
* **Notas de Crédito:** Genera notas de crédito asociadas a boletas o facturas previas ante anulaciones o devoluciones de aportes.
* **Cierre Contable:** Descarga los reportes mensuales consolidados en formato Excel para ser enviados directamente al área contable externa de la empresa.

---

## 4. Gestión de Resúmenes Diarios de Boletas y Bajas (SUNAT)

Para cumplir con las regulaciones de la SUNAT, debes generar y reportar diariamente los comprobantes emitidos:

1. Ingresa a la sección **Resúmenes Diarios y Bajas** (`ResumenDiarioPage.tsx`).
2. **Generación del Resumen:**
   * Selecciona la fecha de los comprobantes a declarar mediante el selector de calendario.
   * Haz clic en **Generar Resumen del Día**. El sistema consultará la base de datos y agrupará todas las boletas de venta emitidas en dicha fecha en la tabla `resumen_diario_boletas`.
   * Revisa la lista previa generada.
3. **Envío Electrónico:**
   * Presiona el botón **Enviar Resumen a SUNAT**.
   * El sistema enviará el paquete XML a los servidores de SUNAT mediante API y obtendrá un número de **Ticket** de respuesta único.
4. **Monitoreo de Tickets:**
   * En la tabla **Historial de Resúmenes Enviados**, realiza el seguimiento del estado de cada envío:
     * `Aceptado`: La SUNAT procesó y validó el resumen con éxito.
     * `Rechazado`: Presenta inconsistencias; deberás subsanar los comprobantes y re-enviar.
     * `Pendiente`: En cola de procesamiento.

---

## 5. Fiscalización y Aprobación de Egresos

Tienes atribuciones para revisar y autorizar los gastos rendidos por el personal técnico antes de consolidarlos en los balances de tesorería:

1. Ve a **Aprobaciones Pendientes**.
2. **Auditoría de Gastos:**
   * Verifica los montos (ingresados como valores negativos en la tabla `gastos`), las clasificaciones (*Viáticos*, *Gasto Fijo* u *Otros*) y la descripción detallada.
   * Abre el archivo adjunto para verificar la validez tributaria del comprobante subido o evalúa los motivos si fue cargado como *Declaración Jurada*.
   * Si es correcto, haz clic en **Aprobar** para habilitar el egreso y actualizar la cuenta afectada.

### Auto-Aprobación de Gastos Administrativos Directos:
Para agilizar la contabilidad ordinaria, cuando registres egresos propios de la administración de finanzas (ej. luz, agua, sueldos de personal o alquiler de oficinas) directamente desde el módulo de **Gastos**, el sistema identificará la categoría como **"Gasto Fijo"** o subcategoría **"Sueldo"** y la insertará directamente en la base de datos como **"Auto-Aprobada"**, evitando pasar por la cola de aprobación.

---

## 6. Procedimiento ante Errores (Solicitudes de Eliminación)

Si cometes un error al digitar una aportación o un egreso ya consolidado en el sistema:
1. No podrás borrar el registro directamente por políticas de seguridad RLS.
2. Deberás enviar una **Solicitud de Eliminación** indicando el motivo y la justificación.
3. Esta solicitud será procesada por el Administrador en la bandeja central. Una vez aprobada, el sistema aplicará un borrado lógico (`deleted_at = now()`), recalculando de manera transparente todos los balances y reportes asociados.
