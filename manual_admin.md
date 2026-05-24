# Guía de Usuario: Administrador - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Administrador**. Como usuario administrador, posees el control absoluto sobre la parametrización de horarios, la asignación de accesos especiales al personal, la autorización y control de presupuestos, el procesamiento de solicitudes críticas de aprobación (tanto de gastos como de eliminaciones) y la revisión de los registros de auditoría del sistema.

---

## 1. Configuración de Horarios y Políticas de Asistencia

La plataforma calcula de forma automática la puntualidad de los ingenieros al ingresar y salir del trabajo:

### Procedimiento para Ajustar Horarios:
1. Ve al panel de **Configuración** y selecciona la pestaña **Horarios**.
2. Define los rangos permitidos para las marcaciones diarias:
   * **Horario de Entrada:** Define la hora de inicio y de fin de la ventana de entrada permitida (por ejemplo, de 09:20 a 09:45). Toda marcación registrada después del límite establecido exigirá obligatoriamente que el ingeniero ingrese una justificación.
   * **Horario de Salida:** Define la hora de inicio y de fin para el registro de salida (por ejemplo, de 18:20 a 18:40). Toda salida fuera de este rango requerirá justificación del empleado.
3. Guarda los cambios. Las nuevas reglas se aplicarán inmediatamente a todas las marcaciones futuras del personal de campo.

---

## 2. Gestión de Personal y Permisos Modulares

Además de los roles preestablecidos (*Administrador*, *Finanzas*, *Ingeniero*), el sistema te permite otorgar o remover **accesos específicos** a cualquier colaborador de forma individual:

### Procedimiento para Asignar Accesos:
1. Ve a la pestaña **Equipo** en el panel de Configuración (o Gestión de Usuarios).
2. Selecciona al colaborador que deseas configurar.
3. Utiliza los selectores individuales para activar o desactivar los siguientes permisos independientes:
   * **Facturación Exclusiva:** Otorga acceso únicamente al módulo de emisión de comprobantes de pago (Boletas, Facturas, Notas de Crédito y resúmenes de declaración tributaria).
   * **Encargado de Inventario:** Permite controlar el almacén técnico, realizar salidas a campo y registrar la devolución de herramientas.
   * **Administrador de Jornada:** Habilita el panel de seguimiento de personal para revisar los registros de horas y registrar marcaciones manuales en caso de olvidos.
   * **Gestor Financiero:** Habilita el control de ingresos de socios, el registro de egresos y el panel de tesorería.
   * **Ver Gastos:** Permite el acceso de solo lectura al registro histórico de gastos.
   * **Ver Ingresos:** Permite el acceso de solo lectura al registro histórico de aportes.
   * **Ver Cuentas:** Permite el acceso de solo lectura al panel de caja y cuentas.

---

## 3. Control y Aprobación de Presupuestos Operativos

Los presupuestos operativos sirven para financiar los traslados y viáticos de los ingenieros en obra. Eres el encargado de evaluar, aprobar y liquidar estas solicitudes:

1. Ve a la sección **Presupuestos**.
2. **Evaluación de Solicitudes:**
   * Ubica las solicitudes en estado *Pendiente*. Haz clic en **Aprobar** o **Rechazar**.
   * Si decides aprobar, puedes modificar el campo **Monto Aprobado** para definir la cantidad definitiva a transferir al ingeniero (por defecto se carga el monto solicitado).
   * Añade observaciones complementarias de la transferencia.
3. **Control de Rendiciones y Cierre:**
   * El sistema descuenta de forma automática el saldo pendiente de cada presupuesto a medida que el ingeniero registra y justifica sus gastos de campo.
   * Una vez que el ingeniero rinda todos los fondos y el saldo quede en cero o sea conciliado, presiona **Cerrar Presupuesto** para archivarlo de forma definitiva y deshabilitar nuevas cargas.

---

## 4. Bandeja de Aprobaciones Contables y Anulaciones

La bandeja de **Aprobaciones Pendientes** centraliza las operaciones sensibles del equipo que requieren la validación de un supervisor:

### A. Aprobación de Gastos Operativos:
* **Origen:** Gastos registrados por los ingenieros de campo (viáticos, consumos generales) y egresos elevados que requieren autorización previa.
* **Acción:**
  * Revisa los datos del gasto: Monto (el sistema representa los egresos con valores negativos para restar de caja), fecha y concepto.
  * Haz clic en **Ver Comprobante** para comprobar la validez de la boleta o factura digital subida, o evalúa las notas del ingeniero si el consumo fue cargado como **Declaración Jurada**.
  * Haz clic en **Aprobar** para insertar formalmente el gasto en el balance general de la empresa. Si el gasto estaba vinculado a un presupuesto, el saldo por rendir se actualizará de inmediato.

### B. Solicitudes de Anulación de Transacciones:
* **Origen:** Peticiones de corrección por parte de los usuarios al digitar de forma incorrecta un ingreso o un egreso ya consolidado.
* **Acción:**
  * Revisa la justificación del error.
  * Al hacer clic en **Aprobar**, el sistema aplicará una anulación administrativa (ocultando el registro del dashboard principal y recalculando de inmediato los saldos de las cuentas y presupuestos afectados).

---

## 5. Bandeja de Eliminación de Archivos y Planos

El panel de **Solicitudes de Eliminación** dentro de la sección de documentos centraliza las peticiones de los ingenieros para borrar archivos de los expedientes digitales de los socios (por ejemplo, planos mal cargados, memorias descriptivas desactualizadas o comprobantes incorrectos).

### Procedimiento:
1. Revisa el documento que se solicita eliminar, el nombre del socio al que pertenece y el motivo del borrado expuesto por el ingeniero.
2. Si la solicitud es válida, haz clic en **Aprobar**.
3. El sistema eliminará permanentemente el archivo físico de los servidores en la nube y lo borrará del expediente digital del socio de manera definitiva.

---

## 6. Auditoría y Registro de Operaciones

La sección de **Seguridad y Auditoría** te permite supervisar cada movimiento realizado dentro de la plataforma para garantizar la transparencia administrativa:

* **Inspección de Transacciones:** El sistema genera un registro automático e inalterable cada vez que se inserta, modifica o elimina un dato en los módulos de ingresos, gastos, socios o control de asistencia.
* **Detalle del Cambio:** Al presionar **Inspeccionar**, podrás comparar:
  * **Datos Anteriores:** El estado de la información antes de la modificación (ideal para auditar errores o restaurar datos).
  * **Datos Nuevos:** El estado de la información guardado después de la modificación.
  * Información del usuario que realizó la acción, el módulo afectado y la hora exacta de la transacción.
* **Exportar Reportes:** Utiliza el botón **Exportar Logs** para descargar la auditoría filtrada directamente en formato Excel.

---

## 7. Registro de Cajas Físicas de Archivo

Para mantener organizadas las carpetas impresas de los socios en el almacén de la oficina, utilizarás el módulo de gestión de cajas:

* **Crear Caja de Archivo:** Registra cada contenedor físico indicando la Localidad, el Año al que corresponden los expedientes y el Número correlativo de caja.
* **Rotulado con Código QR:** 
  * Al crear una caja en el sistema, se generará de manera automática un **Código de Etiqueta** y un **Código QR Único**.
  * Imprime esta etiqueta y adhiérela a la caja física. El personal podrá escanear este código QR físico en el almacén para conocer de forma instantánea qué socios tienen sus expedientes de papel guardados en ese contenedor.
