# Guía de Usuario en el Dashboard: Administrador - FIMAGADI

Bienvenido al manual operativo de usuario para el perfil de **Administrador**. Este documento detalla de manera exhaustiva el funcionamiento del **Dashboard de FIMAGADI** para tu rol, indicando a qué módulos ingresar, qué botones presionar, qué opciones seleccionar y cómo procesar solicitudes de aprobaciones críticas y auditorías dentro de la plataforma.

---

## 1. Módulo de Configuración (Parámetros y Permisos)

El módulo de configuración centraliza los parámetros operativos globales y los accesos del personal:

* **Dónde ir:** En el menú izquierdo, haz clic en **Configuración**.

### A. Gestión de Horarios de Asistencia:
1. Dentro del panel de Configuración, haz clic en la pestaña **Horarios**.
2. Modifica los campos numéricos de horas y minutos:
   * **Horario de Entrada:** Configura las horas de inicio y fin permitidas para que los ingenieros marquen su ingreso sin justificación (ej. de 09:20 a 09:45).
   * **Horario de Salida:** Configura las horas de inicio y fin para el registro de salida (ej. de 18:20 a 18:40).
3. Haz clic en **Guardar**. El sistema aplicará inmediatamente estas tolerancias a todas las marcaciones futuras en el módulo de jornada de los usuarios.

### B. Asignación de Permisos Modulares a Colaboradores:
1. Dentro de Configuración, haz clic en la pestaña **Equipo** (o **Personal**).
2. Selecciona al colaborador de la lista desplegable.
3. Activa o desactiva los conmutadores (switches) individuales para otorgar o revocar accesos en el dashboard:
   * **Facturación Exclusiva:** Activa para que el usuario solo visualice el módulo de facturación y declaraciones.
   * **Encargado de Inventario:** Activa para habilitar los botones de creación de catálogo, asignación de salidas y retornos de herramientas en el módulo de inventario.
   * **Administrador de Jornada:** Habilita la visualización del panel de seguimiento de marcas de asistencia de todos los colaboradores y el botón para registrar marcas manuales de otros.
   * **Gestor Financiero:** Habilita el acceso completo a registrar ingresos, gastos y cuentas.
   * **Ver Gastos / Ver Ingresos / Ver Cuentas:** Permisos de solo lectura para auditar los balances del dashboard sin capacidad de registrar transacciones.

---

## 2. Módulo de Presupuestos (Autorización y Cierre)

Como Administrador, tienes el control exclusivo sobre la aprobación y el archivo de solicitudes de fondos para viáticos de campo:

* **Dónde ir:** Haz clic en **Presupuestos** en el menú izquierdo.
* **Aprobación de Solicitudes:**
  1. Identifica los registros con la etiqueta amarilla *Pendiente*.
  2. Haz clic en el botón **Aprobar**.
  3. Se abrirá una ventana emergente. Revisa la cantidad solicitada por el ingeniero. En el campo **Monto Aprobado**, puedes ajustar y digitar la cantidad definitiva a asignar (por defecto se carga el monto solicitado).
  4. Digita observaciones explicativas de la transacción en el cuadro de notas y presiona **Confirmar**. El presupuesto cambiará a estado *Aprobado* y el ingeniero visualizará su saldo disponible.
* **Rechazo de Solicitudes:**
  1. Haz clic en el botón **Rechazar**.
  2. En el cuadro de diálogo, escribe obligatoriamente el motivo del rechazo para informar al ingeniero.
* **Cierre y Liquidación Contable:**
  1. El sistema descuenta del presupuesto los gastos que el ingeniero va registrando enlazados a dicho código.
  2. Cuando el presupuesto esté completamente rendido y el saldo concilie a cero, haz clic en el botón **Cerrar Presupuesto** para archivarlo como histórico y bloquear nuevas vinculaciones de gastos.

---

## 3. Bandeja de Aprobaciones Pendientes (Gastos y Anulaciones)

Este panel centraliza las operaciones del personal que requieren la autorización de un supervisor antes de impactar el balance de la empresa:

* **Dónde ir:** Haz clic en **Aprobaciones Pendientes** en el menú lateral.

### A. Autorización de Gastos:
1. Revisa la lista de gastos pendientes enviados por los ingenieros de campo.
2. Haz clic en el enlace **Ver Comprobante** para abrir la imagen o PDF del sustento en otra pestaña, o lee los comentarios si el gasto fue declarado como *Declaración Jurada*.
3. Si el gasto está vinculado a un presupuesto, el sistema mostrará una alerta indicando el código y motivo del presupuesto afectado.
4. Presiona **Aprobar** para insertar formalmente el egreso (registrado con valor negativo) en el flujo de cuentas del sistema y actualizar el saldo del presupuesto. Presiona **Rechazar** si no procede.

### B. Autorización de Anulación de Ingresos o Gastos:
1. Si un usuario reporta que digitó mal una transacción (ingreso o egreso) y solicita su corrección, verás la solicitud detallando el ID de transacción y el motivo de anulación.
2. Revisa el caso y haz clic en **Aprobar**.
3. El sistema anulará administrativamente la transacción (la ocultará de los listados generales y actualizará al instante los saldos consolidados de cuentas y presupuestos).

---

## 4. Bandeja de Eliminación de Archivos (en Expedientes)

Esta bandeja te permite autorizar la eliminación física de documentos y planos en la nube solicitados por los ingenieros:

* **Dónde ir:** Ingresa a **Expedientes Digitales** (o **Documentos**) y haz clic en la pestaña **Solicitudes de Eliminación** (solo visible para Administradores).
* **Cómo procesar:**
  1. Revisa el documento que se solicita eliminar, el socio al que pertenece y la justificación dada por el ingeniero de campo.
  2. Haz clic en **Aprobar** para borrar de forma definitiva el archivo del servidor de almacenamiento de la plataforma y retirar el link del expediente digital del socio, o haz clic en **Rechazar** para descartar la solicitud.

---

## 5. Módulo de Seguridad y Auditoría

Este módulo te permite supervisar cada interacción y modificación de datos realizada en el sistema:

* **Dónde ir:** Haz clic en el menú **Auditoría**.
* **Cómo Inspeccionar Modificaciones:**
  1. Visualiza el listado de eventos ordenados cronológicamente.
  2. Haz clic en el botón **Inspeccionar** sobre cualquier log.
  3. Se abrirá una ventana emergente mostrando dos recuadros de código JSON:
     * **Datos Anteriores:** Muestra cómo estaba registrada la información antes de la acción del usuario.
     * **Datos Nuevos:** Muestra el cambio exacto guardado tras la acción.
  4. Identifica qué usuario realizó el cambio y a qué hora precisa.
* **Descarga de Reporte:** Haz clic en **Exportar Logs** para descargar la lista filtrada de eventos en formato Excel.
