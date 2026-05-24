# Guía de Usuario: Administrador - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Administrador**. Como usuario administrador, posees privilegios totales sobre la configuración del sistema, la administración de personal y permisos personalizados, la fiscalización presupuestaria, el procesamiento de solicitudes de aprobaciones críticas, y la auditoría de eventos inmutables de la base de datos.

---

## 1. Configuración del Sistema y Parámetros Operativos

El módulo **Configuración** (dentro del menú de Administración) permite modelar el comportamiento global de las reglas del negocio de FIMAGADI:

### A. Control de Asistencia y Tolerancias (Tabla `configuracion`)
El sistema valida automáticamente las marcaciones de los ingenieros contrastando sus horarios de marcado con la tabla `configuracion` (claves: `horario_entrada` y `horario_salida`).
1. Ve a la pestaña **Horarios** en el panel de Configuración.
2. Define los rangos de inicio y fin para el ingreso y salida permitidos:
   * *Horario de Entrada:* Por defecto configurado como `{"inicio": "09:20", "fin": "09:45"}`. Cualquier marca fuera de este rango requerirá justificación del empleado.
   * *Horario de Salida:* Por defecto configurado como `{"inicio": "18:20", "fin": "18:40"}`.
3. Al guardar, los cambios se escriben directamente en la base de datos y surten efecto inmediato para todos los colaboradores de campo.

### B. Gestión de Personal y Permisos Granulares (`custom_permissions` JSONB)
En FIMAGADI, además de los roles tradicionales (`admin`, `finanzas_senior`, `engineer`), puedes asignar **permisos modulares específicos** a cualquier colaborador. Esto se almacena en la columna JSONB `custom_permissions` de la tabla `colaboradores`.
1. Ve a la pestaña **Equipo** en Configuración.
2. Selecciona al colaborador que deseas configurar.
3. Activa o desactiva las casillas correspondientes para otorgar las siguientes capacidades independientes:
   * **Facturación Exclusiva (`can_invoice_only`):** Habilita únicamente el acceso al módulo de emisión de boletas, facturas y resúmenes diarios de SUNAT.
   * **Encargado de Inventario (`can_manage_inventory`):** Asigna privilegios completos sobre el almacén de equipos (creación de catálogo, checkout atómico de herramientas y devoluciones).
   * **Administrador de Jornada (`can_manage_jornada`):** Otorga permisos para ver el seguimiento del personal y registrar/editar manualmente registros de asistencia de otros empleados.
   * **Gestor Financiero (`can_manage_finances`):** Permite ver, registrar y auditar todos los ingresos, egresos y conciliación de cuentas.
   * **Visualización de Egresos (`can_view_expenses`):** Acceso en modo lectura al registro histórico de gastos.
   * **Visualización de Ingresos (`can_view_income`):** Acceso en modo lectura al registro histórico de aportes de socios.
   * **Visualización de Cuentas (`can_view_accounts`):** Acceso en modo lectura al panel de tesorería y balances de caja.

---

## 2. Gestión y Liquidación de Presupuestos Operativos

Los presupuestos operativos (`presupuestos_operativos`) permiten financiar los traslados y compras del equipo en obra. Como Administrador, eres el responsable de evaluar y liquidar estas solicitudes:

1. Ve a la sección **Presupuestos**.
2. **Evaluación de Solicitudes Pendientes:**
   * Ubica las solicitudes en estado `Pendiente`. Haz clic en **Aprobar** o **Rechazar**.
   * Si decides aprobar, evalúa el presupuesto aproximado del ingeniero. Puedes redefinir y fijar el **Monto Aprobado** definitivo.
   * Digita las observaciones de la transacción (ej. *"Aprobado y depositado en la cuenta de viáticos del Ingeniero para viáticos de Mayo"*).
3. **Control y Liquidación (Cierre de Presupuesto):**
   * El sistema calcula dinámicamente el dinero utilizado del presupuesto mediante la función `updateMontoRendido`. Cada vez que el ingeniero registre una boleta o declaración jurada enlazada a su presupuesto, su saldo por rendir se actualizará.
   * Cuando el ingeniero haya rendido la totalidad de los fondos y el saldo neto sea conciliado, haz clic en **Cerrar Presupuesto** para archivarlo y deshabilitar nuevas cargas asociadas a ese código.

---

## 3. Central de Aprobaciones del Sistema (Finanzas y Eliminaciones)

La bandeja de **Aprobaciones Pendientes** (`AprobacionesPage.tsx`) procesa las solicitudes críticas generadas por los usuarios que no poseen facultades de inserción directa. Los registros pendientes provienen de la tabla `approval_requests`:

### A. Procesamiento de Gastos Pendientes (`expense_approval` / `engineer_expense` / `high_expense`):
* **Origen:** Gastos viáticos o generales declarados por ingenieros de campo (con o sin comprobantes) y gastos elevados que exceden los límites regulares.
* **Acción:**
  * Revisa los datos en el panel: Monto (representado en negativo para egresos), Categoría, Subcategoría, y Descripción.
  * Verifica el soporte físico del gasto: haz clic en *"Ver Comprobante"* para auditar la factura/boleta digital o constata si se declaró como *"Declaración Jurada"*.
  * Si es correcto, haz clic en **Aprobar**. Esto insertará de forma atómica el registro en la tabla `gastos`, calculará su correspondiente código correlativo de gasto (`numero_gasto` como `GA001`, `GA002` etc.), y recalculará la rendición del presupuesto operativo vinculado.

### B. Procesamiento de Eliminación de Transacciones (`delete_income` / `delete_expense`):
* **Origen:** Solicitudes enviadas por el personal para corregir errores de digitación de ingresos o egresos ya consolidados.
* **Acción:**
  * Audita la justificación y los ID de los registros involucrados.
  * Al hacer clic en **Aprobar**, el sistema aplica un **Borrado Lógico** en la base de datos (llenando la columna `deleted_at = now()`). Esto oculta la transacción del dashboard y los reportes para mantener la integridad contable, y recalcula automáticamente los balances de las cuentas y presupuestos afectados.

---

## 4. Bandeja de Eliminación de Documentos Sensibles

El módulo **Solicitudes de Eliminación** (`DeletionRequestsPage.tsx`) centraliza las peticiones de ingenieros para borrar archivos de los expedientes digitales de los socios (DNI, planos, memorias descriptivas, contratos).

### Procedimiento de Aprobación:
1. Ve a la pestaña **Solicitudes de Eliminación** dentro de la sección de Documentos.
2. Audita el tipo de documento solicitado a borrar, el nombre del socio afectado, y la justificación ingresada por el ingeniero.
3. Haz clic en **Aprobar** para ejecutar la eliminación permanente:
   * El sistema eliminará físicamente el archivo del Supabase Storage (buscando en los buckets `planos`, `memoria-descriptiva` o `documents`).
   * Borrará permanentemente la fila en la tabla `socio_documentos` y el registro en la tabla `document_deletion_requests`.

---

## 5. Auditoría Inmutable del Sistema (Audit Logs)

La sección **Seguridad y Auditoría** (`AuditPage.tsx`) ofrece total transparencia sobre el uso de la plataforma. La base de datos registra de por vida cada alteración de datos mediante triggers a nivel del motor PostgreSQL (`fn_audit_trigger`):

* **Eventos Auditados:** Registra de forma obligatoria las operaciones `INSERT`, `UPDATE` y `DELETE` en las tablas `ingresos`, `gastos`, `socio_titulares` y `registros_jornada`.
* **Detalle del Cambio:** Al hacer clic en **Inspeccionar** sobre cualquier log, verás una comparativa exacta de:
  * **Datos Anteriores (`old_data`):** El estado del registro antes del cambio en formato JSON (muy útil para reconstruir o revertir modificaciones incorrectas).
  * **Datos Nuevos (`new_data`):** El estado final del registro en formato JSON.
  * Identificación del autor de la modificación (`changed_by`), tabla afectada y fecha exacta.
* **Exportación de Logs:** Puedes utilizar el botón **Exportar Logs** para descargar la auditoría filtrada directamente en formato Excel (`.xlsx`) para revisiones de gerencia.

---

## 6. Organización de Archivos Físicos (`cajas_archivo`)

El Administrador (o el Encargado de Inventario) debe asegurar la catalogación y ubicación física de los expedientes originales en papel. Para ello, utilizarás la tabla de base de datos `cajas_archivo`:

* **Estructura de Archivamiento:** Cada caja física debe ser registrada en el sistema especificando:
  * **Localidad ID (`localidad_id`):** Comunidad de donde proceden los expedientes.
  * **Año de Expediente (`anio_expediente`):** Ej. `2026`.
  * **Número de Caja (`numero_caja`):** El correlativo numérico de organización en la estantería física.
* **Rotulado y Código QR:** 
  * Al crear una caja, el sistema generará automáticamente un Código Único de Etiqueta (`codigo_etiqueta`) y un identificador QR único (`qr_uuid`).
  * Deberás imprimir y adherir la etiqueta QR en la caja física. Esto permitirá a los ingenieros y encargados escanear la caja física en el almacén para saber instantáneamente qué socios tienen sus carpetas en papel dentro de esa caja.
