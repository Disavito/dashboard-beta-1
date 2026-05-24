# Guía de Usuario: Administrador - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Administrador**. Como Administrador de la plataforma, posees privilegios de control sobre todos los parámetros globales del sistema, la asistencia diaria, las autorizaciones de presupuestos del equipo, y la asignación de permisos individuales. Asimismo, esta guía cubre las funciones de gestión de activos físicos y consumibles (Inventario), las cuales pueden ser ejecutadas directamente por ti o por el colaborador designado como **Encargado de Inventario**.

---

## 1. Configuración del Sistema e Infraestructura
El módulo **Configuración** (dentro de la pestaña de Administración) es la central para gestionar las políticas de FIMAGADI:

* **Control de Asistencia (Horarios de Jornada):**
  1. Ve a la pestaña **Horarios** en Configuración.
  2. Modifica el horario de inicio y fin permitido (Desde/Hasta) para el marcado de entrada y salida del personal de campo.
  3. Los cambios guardados reconfiguran de inmediato las alertas y justificaciones requeridas para los ingenieros.
* **Control de Categorías:** Monitorea y revisa la lista de categorías y subcategorías que se emplean para clasificar los ingresos y egresos.
* **Equipo y Permisos Especiales (Acceso de Personal):**
  1. Ve a la pestaña **Equipo** en Configuración.
  2. Selecciona a cualquier colaborador registrado con un usuario activo en el sistema.
  3. Utiliza los switches individuales para otorgar o remover permisos modulares de acceso (ej. activar el acceso a *Ingresos*, a *Gastos*, a *Facturación*, o designar a un usuario específico la capacidad de administrar *Inventarios*).

---

## 2. Gestión de Presupuestos Operativos
Como Administrador, eres responsable de la evaluación, control y liquidación de las solicitudes de fondos operativos que presenten los ingenieros:

1. Ingresa a la sección **Presupuestos**.
2. **Aprobación de Solicitudes:**
   * Ubica las solicitudes en estado `Pendiente`. Haz clic en **Aprobar**.
   * Revisa la cantidad estimada del ingeniero. Si lo consideras oportuno, ajusta y define el **Monto Aprobado** definitivo.
   * Agrega las notas de transacción correspondientes (ej. *"Monto aprobado y transferido a tarjeta de gastos de obra"*). Confirma.
3. **Rechazo de Solicitudes:** Presiona **Rechazar** e indica la causa o información faltante.
4. **Cierre de Presupuesto:** Monitorea el progreso de rendición de cuentas de cada presupuesto. Cuando el ingeniero rinda todos los gastos vinculados mediante comprobantes aprobados y el saldo sea conciliado, haz clic en **Cerrar Presupuesto** para guardarlo como histórico.

---

## 3. Procesamiento de Aprobaciones (Gastos y Eliminaciones)
La bandeja de aprobaciones centraliza todas las validaciones de dinero saliente y cambios estructurales solicitados por el equipo:

1. Ingresa al módulo **Aprobaciones Pendientes**.
2. **Aprobación de Gastos:**
   * Audita la boleta/factura adjunta o si el gasto se cargó como Declaración Jurada. El sistema te informará si el gasto está vinculado a un presupuesto operativo específico.
   * Haz clic en **Aprobar** para insertar el gasto formalmente en la contabilidad.
3. **Aprobación de Solicitudes de Eliminación:**
   * Si un usuario solicita la anulación de un ingreso o gasto por un error de digitación, verás su solicitud de eliminación y su respectiva justificación.
   * Haz clic en **Aprobar** para borrar permanentemente el registro.

---

## 4. Gestión de Activos Fijos (Encargado de Inventario)
Esta sección aplica de forma exclusiva al Administrador o al colaborador designado como **Encargado de Inventario** en el sistema:

* **Control de Stock:** Entra a **Inventario**. Utiliza el botón "Añadir Item" para catalogar nuevos equipos (drones, GPS, winchas) o registrar stock de consumibles (guantes, pilas).
* **Asignar Equipo (Salida a Campo):**
  1. Haz clic en el botón **Asignar Equipo**.
  2. Selecciona al Ingeniero responsable y la cantidad de unidades.
  3. Ingresa las observaciones del estado del activo y guarda. El sistema descontará las unidades del almacén central y las cargará en la tabla de asignaciones activas del Ingeniero.
* **Retorno de Equipos (Devolución):** Cuando el Ingeniero retorne de su salida de campo, busca su asignación activa en el panel de inventario y registra la devolución del activo para restablecer el stock disponible.

---

## 5. Auditoría de Eventos
* **Monitoreo de Logs:** Accede al menú **Auditoría** para revisar el historial completo de eventos del sistema (inicios de sesión, actualizaciones de bases de datos, y borrados de registros) garantizando la transparencia de las operaciones digitales de la empresa.
