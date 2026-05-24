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

## 3. Registro de Socios y Criterios de Calificación

Como Administrador, supervisas la integridad de los padrones de socios y debes asegurar la correcta aplicación de los siguientes flujos de registro:

### A. Corroboración de Datos:
Al empadronar o modificar un socio usando el buscador automático de DNI, se debe verificar siempre que la información cargada de los registros oficiales coincida exactamente con la identidad real del titular antes de guardar la ficha.

### B. Autocompletado de Ubicación:
Al seleccionar la Localidad del socio en la pestaña personal, el sistema auto-completa de forma automática el Distrito, Provincia y Región de la vivienda en la pestaña de domicilio. El operador solo debe capturar la Dirección física exacta de la vivienda.
* **Manzana (Mz) y Lote (Lt):** El llenado de la Manzana y el Lote es opcional. No obstante, si se dispone de estos datos físicos, es obligatorio ingresarlos en el sistema.

### C. Regla para Socios de Extrema Pobreza:
* Los socios clasificados bajo la condición de **Extrema Pobreza** están exonerados de pagos monetarios.
* Sin embargo, es obligatorio que se genere un **recibo con un monto de S/. 0.00** en la plataforma para regularizar e integrar su expediente en el dashboard sin alterar la contabilidad real de caja.

### D. Gestión de Observaciones Administrativas y Financieras:
* **Socio Observado (Administrativo):** Si al socio le falta presentar su constancia de posesión original, si está duplicado en el sistema, o si presenta cualquier otro detalle administrativo pendiente, se debe marcar la opción **Observado** indicando detalladamente el motivo de la irregularidad.
* **Pago Observado (Financiero):** Se utiliza únicamente en situaciones específicas del cobro (por ejemplo, si el recibo/pago está duplicado, o si el Yape se depositó por error a la cuenta de un tercero). Esto permite marcar el pago como observado para que sea rectificado o saneado posteriormente por el área de finanzas.

### E. Tipos de Recibos Válidos:
Al evaluar los expedientes, debes considerar que coexisten dos sustentos de pago:
1. **Recibos Físicos:** Comprobantes emitidos manualmente en papel antes de la creación del sistema digital actual. Varios socios históricos solo poseen este formato, el cual es válido para acreditar su solvencia.
2. **Recibos Virtuales:** Comprobantes emitidos y registrados a través del dashboard contable actual.

---

## 4. Control y Aprobación de Presupuestos Operativos

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

## 5. Bandeja de Aprobaciones Contables y Anulaciones

La bandeja de **Aprobaciones Pendientes** centraliza las operaciones de egresos y anulaciones que requieren la validación de un supervisor:

* **Aprobación de Gastos Operativos:** Revisa los datos de los egresos reportados por los ingenieros (montos, clasificaciones y conceptos), verifica el comprobante digital o la Declaración Jurada, y presiona **Aprobar** para grabarlo y deducir el saldo del presupuesto vinculado.
* **Anulación de Transacciones (Ingresos o Gastos):** Ante solicitudes del personal por errores de digitación de aportes o compras consolidadas, evalúa el motivo y aprueba la solicitud para realizar una anulación administrativa (ocultando el registro del dashboard principal y recalculando de inmediato los saldos de las cuentas y presupuestos afectados).

---

## 6. Bandeja de Eliminación de Archivos y Planos

El panel de **Solicitudes de Eliminación** dentro de la sección de documentos centraliza las peticiones de los ingenieros para borrar archivos de los expedientes digitales de los socios (por ejemplo, planos mal cargados, memorias descriptivas desactualizadas o comprobantes incorrectos).

### Procedimiento:
1. Revisa el documento que se solicita eliminar, el nombre del socio al que pertenece y el motivo del borrado expuesto por el ingeniero.
2. Si la solicitud es válida, haz clic en **Aprobar**.
3. El sistema eliminará permanentemente el archivo físico de los servidores en la nube y lo borrará del expediente digital del socio de manera definitiva.

---

## 7. Auditoría y Registro de Operaciones

La sección de **Seguridad y Auditoría** te permite supervisar cada movimiento realizado dentro de la plataforma para garantizar la transparencia administrativa:

* **Inspección de Transacciones:** El sistema genera un registro inalterable cada vez que se inserta, modifica o elimina un dato en los módulos de ingresos, gastos, socios o control de asistencia.
* **Detalle del Cambio:** Al presionar **Inspeccionar**, podrás comparar la información guardada antes y después de la modificación, identificando al usuario que realizó la acción y la hora exacta de la transacción.
* **Exportar Reportes:** Utiliza el botón **Exportar Logs** para descargar la auditoría filtrada directamente en formato Excel.
