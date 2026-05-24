# Guía de Usuario: Finanzas - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Finanzas**. Como responsable del área contable, control de fondos y tesorería de la empresa, posees el acceso a las herramientas de recaudación, conciliación bancaria, facturación tributaria, y declaración electrónica de resúmenes diarios ante la SUNAT.

---

## 1. Registro de Aportaciones de Socios (Ingresos)

El módulo de **Ingresos** te permite llevar un control riguroso de todos los pagos y cuotas ordinarias o extraordinarias realizadas por los socios titulares:

### Registrar Ingreso Individual:
1. Ve a la sección **Ingresos** y haz clic en **Registrar Ingreso**.
2. Digita el DNI o Nombre del titular en el campo de búsqueda. El sistema recuperará automáticamente sus datos de identidad de la base de datos de socios.
3. Rellena los datos de la transacción en el formulario:
   * **Monto:** Escribe el valor exacto recibido en Soles.
   * **Fecha:** Elige el día en que se hizo efectivo el cobro.
   * **Cuenta:** Selecciona la cuenta bancaria de la empresa donde ingresará el dinero (por ejemplo, *BBVA*, *BCP* o *Efectivo*).
   * **Tipo de Transacción:** Selecciona el método de pago (*Efectivo*, *Depósito* o *Transferencia*).
   * **Número de Operación:** Digita el número de comprobante o código de transacción bancaria para futuras conciliaciones.
4. **Emisión de Recibo en PDF:** Al guardar la transacción, el sistema le asignará un número correlativo de recibo automático, ingresará el cobro a las cuentas del sistema y generará de inmediato un comprobante digital en PDF listo para ser descargado o impreso para el socio.

---

## 2. Conciliación y Flujo de Cuentas Bancarias

El panel de **Cuentas y Tesorería** es tu consola de supervisión de liquidez y flujos en tiempo real:

* **Gráficas de Análisis:** En la parte superior, revisa los gráficos analíticos mensuales. Puedes cambiar la escala de tiempo a *Día, Mes, Trimestre o Año* para visualizar la relación entre ingresos y gastos.
* **Control y Cuadrado de Caja:**
  * En la tabla de **Historial Unificado**, revisa las últimas transacciones registradas.
  * Verifica que cada aporte e informe de gasto esté vinculado a su cuenta bancaria correspondiente para que el saldo de la plataforma coincida exactamente con tus estados de cuenta bancarios reales.
* **Generación de Cierre de Caja:**
  * Puedes filtrar el historial usando palabras clave, nombres de socios o números de recibos.
  * Presiona el botón **Reporte PDF (Cierre)** para descargar un documento formal en PDF que consolide todos los movimientos financieros registrados en el periodo seleccionado.

---

## 3. Emisión de Comprobantes y Facturación Comercial

El módulo de Facturación centraliza la administración tributaria y contable de los socios:

* **Consulta de Comprobantes:** Revisa e inspecciona el historial de Facturas, Boletas de Venta y Notas de Crédito generadas por el sistema.
* **Anulación con Notas de Crédito:** Emite notas de crédito vinculadas a comprobantes emitidos previamente en caso de anulaciones de aportes o devoluciones.
* **Cierre Contable:** Exporta las transacciones del mes a un archivo consolidado en Excel y compártelo directamente con el contador de la empresa para la liquidación mensual de impuestos.

---

## 4. Resúmenes Diarios de Boletas y Comunicaciones de Baja (SUNAT)

Para cumplir con las normas fiscales, debes reportar de forma diaria los comprobantes simplificados (boletas) emitidos por la organización:

1. Ve a la sección **Resúmenes Diarios y Bajas**.
2. **Generación del Resumen:**
   * Utiliza el selector de calendario para elegir el día de las boletas que deseas declarar.
   * Haz clic en **Generar Resumen del Día**. El sistema buscará todas las boletas de esa fecha y armará un agrupamiento detallado. Revisa que el listado esté completo.
3. **Envío a SUNAT:**
   * Haz clic en el botón **Enviar Resumen a SUNAT**. El sistema transmitirá los comprobantes a la plataforma electrónica tributaria y te asignará un número de **Ticket** de seguimiento.
4. **Monitoreo de Tickets:**
   * Revisa la tabla del **Historial de Resúmenes Enviados** para verificar el estado devuelto por SUNAT:
     * *Aceptado:* El envío fue exitoso y la declaración está conforme.
     * *Rechazado:* Presenta inconsistencias; deberás revisar los recibos de la fecha y volver a transmitir.
     * *Pendiente:* En cola de espera en la plataforma tributaria.

---

## 5. Auditoría y Registro de Egresos (Gastos)

Tienes la responsabilidad de fiscalizar los gastos reportados por los ingenieros de campo antes de registrarlos formalmente como egresos de la tesorería:

1. Ve a la sección **Aprobaciones Pendientes**.
2. **Fiscalización de Consumos:**
   * Revisa el monto, la fecha, la categoría (por ejemplo, *Viáticos* u *Otros*) y el concepto detallado.
   * Presiona **Ver Comprobante** para comprobar que el archivo digital adjunto coincida con lo digitado, o audita la justificación si el gasto fue registrado como **Declaración Jurada**.
   * Verifica si está asociado a un presupuesto operativo y si su concepto está alineado con la justificación del viaje de campo.
   * Si todo está correcto, haz clic en **Aprobar** para registrar el egreso y descontar el monto de la cuenta bancaria seleccionada.

### Gastos Administrativos Auto-Aprobados:
Para optimizar el flujo de trabajo, cuando registres egresos de la administración desde el módulo de gastos (por ejemplo, compras de oficina, servicios públicos, sueldos o pago de alquileres), el sistema identificará la categoría de *Gasto Fijo* o subcategoría de *Sueldo* y la insertará directamente como **"Auto-Aprobada"**, debitando el dinero de caja chica de inmediato sin requerir aprobación.

---

## 6. Procedimiento para Anulación de Transacciones Erróneas

Si cometes un error al registrar un ingreso o un egreso ya consolidado:
1. No podrás eliminar el registro de forma directa por motivos de seguridad del sistema.
2. Deberás enviar una **Solicitud de Eliminación** detallando la justificación del error.
3. Esta solicitud se enviará al Administrador. Una vez que este la apruebe, el sistema anulará el registro contable automáticamente (ocultándolo de las vistas del dashboard y recalculando de inmediato los saldos de cuentas y presupuestos afectados).
