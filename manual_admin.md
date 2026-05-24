# Guía de Usuario: Administrador - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Administrador**. Como administrador de la plataforma, tienes el control de la configuración global, las ventanas horarias de asistencia, el inventario general de activos, la asignación de permisos especiales del personal y las aprobaciones de fondos operativos del equipo.

---

## 1. Configuración del Sistema e Infraestructura
La sección **Configuración** (en la pestaña de Administración) es la central operativa para definir los parámetros de la empresa:

* **Gestión de Horarios (Jornadas):**
  1. Ve a la pestaña **Horarios** dentro de Configuración.
  2. Define los rangos exactos de hora (Desde/Hasta) permitidos para que el personal de campo registre su ingreso y su salida diaria.
  3. Los cambios guardados se aplican inmediatamente a las validaciones de asistencia.
* **Control de Categorías:** Revisa y gestiona las categorías y subcategorías únicas detectadas en los gastos contables del sistema.
* **Equipo y Permisos Especiales (Crítico):**
  1. Ve a la pestaña **Equipo** en Configuración. Verás la lista de colaboradores asociados a usuarios del sistema.
  2. Utiliza los switches individuales para activar o desactivar permisos especiales de acceso a módulos específicos (ej. otorgar a un ingeniero acceso temporal a *Ingresos*, a *Gastos* generales o al *Control de Jornadas*).

---

## 2. Gestión de Presupuestos Operativos
Como administrador, eres el encargado de evaluar, aprobar y cerrar las bolsas de dinero (fondos a rendir) de los ingenieros de campo:

1. Ingresa al módulo **Presupuestos**.
2. **Aprobación de Solicitudes:**
   * Encontrarás las peticiones en estado `Pendiente`. Haz clic en **Aprobar**.
   * Revisa el monto solicitado. Si es necesario, edita y define el **Monto Aprobado** definitivo a transferir.
   * Agrega notas informativas (ej. *"Aprobado y transferido al banco Continental"*). Confirma la acción.
3. **Rechazo de Solicitudes:** Si la solicitud no procede, haz clic en **Rechazar** e ingresa la razón de rechazo para notificar al solicitante.
4. **Cierre Contable:** Observa el progreso de rendición de cada presupuesto en su tarjeta correspondiente (*Monto Aprobado*, *Gastos Rendidos* sustentados y *Saldo por Justificar*). Cuando la rendición en campo se complete y el saldo llegue a cero, haz clic en **Cerrar Presupuesto** para archivarlo.

---

## 3. Bandeja de Aprobaciones Pendientes (Gastos y Eliminaciones)
Cada vez que un colaborador registra un gasto que requiere revisión o solicita borrar un registro por error, la solicitud llega a tu bandeja central:

1. Ve a **Aprobaciones Pendientes**.
2. **Aprobar Gastos:**
   * Revisa el concepto del gasto, el comprobante de pago cargado o si cuenta con Declaración Jurada.
   * Haz clic en **Aprobar**. El gasto se integrará a los balances financieros e impactará automáticamente en el saldo del presupuesto vinculado (si corresponde).
3. **Aprobar Solicitudes de Eliminación:**
   * Si un usuario solicita borrar un ingreso o gasto erróneo, verás su solicitud de eliminación y su motivo.
   * Haz clic en **Aprobar** para borrar físicamente el registro de la base de datos de manera limpia y segura.

---

## 4. Control de Inventario y Activos Fijos
El módulo de **Inventario** te permite gestionar el catálogo de activos fijos (GPS, drones, etc.) y consumibles (pilas, guantes) de la empresa:

* **Ingresar Activos:** Registra nuevos items definiendo su nombre, descripción, stock inicial y si es un activo fijo asignable o un consumible.
* **Asignar Equipo (Salida a Campo):**
  1. Haz clic en **Asignar Equipo**.
  2. Selecciona al ingeniero responsable, la cantidad de unidades y agrega observaciones detalladas.
  3. Al guardar, el stock disponible en almacén se descontará y el activo se registrará bajo la custodia del ingeniero en la tabla histórica de asignaciones.
* **Retorno de Equipos (Devolución):** Cuando el ingeniero retorne el activo al almacén central, registra la devolución para que el equipo vuelva a figurar como disponible en stock.

---

## 5. Auditoría de Seguridad
Como administrador, tienes acceso exclusivo a la pantalla de **Auditoría**. Aquí puedes monitorear y descargar los logs de eventos del sistema para auditar qué usuario realizó acciones críticas, cuándo se conectó y qué modificaciones se hicieron a nivel de base de datos.
