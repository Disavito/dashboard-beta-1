# Guía de Usuario: Encargado de Inventario - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Encargado de Inventario**. Este rol (el cual puede ser ejercido por el Administrador o cualquier colaborador con permisos de inventario en el sistema) es responsable del control físico y digital de todas las herramientas técnicas, consumibles y activos fijos asignados al personal para salidas a campo (tales como drones de topografía, GPS, laptops de obra, winchas métricas, equipos de protección, etc.).

---

## 1. Registro y Control de Equipos en Catálogo

El catálogo centralizado te permite registrar todo el equipamiento disponible en la empresa:

### Registrar un Nuevo Equipo:
1. Ingresa a la sección de **Inventario** y ve a la pestaña **Catálogo**.
2. Haz clic en el botón **Nuevo Equipo** (disponible en la esquina superior derecha si tienes los permisos habilitados).
3. Completa los campos solicitados:
   * **Nombre:** El nombre descriptivo del activo (ej. *GPS Diferencial Leica*).
   * **Descripción (Opcional):** Talla, color, marca, modelo o número de serie (ej. *Modelo GS18, Color Rojo, Talla M*).
   * **Stock Inicial:** La cantidad física absoluta de unidades disponibles a ingresar al almacén.
4. Presiona **Guardar**. El sistema registrará el equipo y dividirá las cantidades en:
   * *Stock Total:* La cantidad de unidades que la empresa posee.
   * *Stock Disponible:* Las unidades libres en almacén listas para ser entregadas.

*Nota:* Si un activo es dado de baja o destruido, puedes darlo de baja haciendo clic en el ícono de **Eliminar** (Tacho de basura) en su tarjeta de catálogo.

---

## 2. Salida de Equipos a Campo (Entrega)

Antes de que un ingeniero o técnico se retire a campo, debes registrar las herramientas que se lleva bajo su firma digital de responsabilidad:

### Flujo de Registro de Salida:
1. Haz clic en **Registrar Salida** en el panel de inventario.
2. **Seleccionar Colaborador:** Elige al Ingeniero o técnico de campo en la lista desplegable.
3. **Seleccionar Equipos (Salida de Múltiples Ítems):**
   * El sistema te permite registrar la entrega de varias herramientas diferentes de una sola vez.
   * Elige una herramienta de la lista (el sistema te muestra cuántas unidades disponibles hay en almacén).
   * Define la **Cantidad** entregada.
   * Si lleva otros equipos, haz clic en **+ Agregar otro equipo** y repite el proceso.
4. **Observaciones:** Registra detalles del estado físico del activo al ser entregado (ej. *"Se entrega con batería cargada y maletín de transporte"*).
5. **Confirmar Entrega:**
   * Al hacer clic en **Confirmar Salida**, el sistema procesará la transacción de forma segura.
   * *Seguridad contra Reservas Simultáneas:* El sistema bloquea temporalmente los ítems seleccionados para asegurar que dos personas no asignen el mismo stock disponible al mismo tiempo.
   * Al procesarse, el stock disponible en el catálogo se restará de forma inmediata y las herramientas se cargarán como custodias activas bajo el nombre del ingeniero seleccionado.

---

## 3. Recepción y Devolución de Herramientas

Cuando el personal retorne de campo, debe entregar las herramientas para liberar su responsabilidad de custodia y reincorporarlas al almacén.

### Modalidad A: Devolución Individual (Equipo por Equipo)
1. Ve a la pestaña **Equipos en Campo**.
2. Ubica al Ingeniero en la lista y encuentra la herramienta específica que está entregando.
3. Haz clic en el botón **Devolver** ubicado a la derecha de la descripción de la herramienta.
4. El sistema cambiará el estado de la asignación a devuelto, registrará la fecha y hora de entrega y reincorporará la cantidad devuelta de forma automática al stock disponible del catálogo.

### Modalidad B: Recepción Total (Masiva por Colaborador)
Si el ingeniero regresa con todos sus equipos asignados al mismo tiempo y deseas recibirlos de un solo clic para ahorrar tiempo:
1. Haz clic en el botón **Recepción Total** (esquina superior derecha).
2. Selecciona al Ingeniero en la lista desplegable.
3. El sistema te mostrará un panel consolidado con todas las herramientas que tiene a su cargo en campo actualmente.
4. Verifica físicamente que todo esté conforme.
5. Haz clic en **Confirmar Devolución**. El sistema cerrará todas sus asignaciones activas a la vez y reincorporará la totalidad de los equipos al catálogo disponible.

---

## 4. Historial y Auditoría de Movimientos

Para auditorías o controles periódicos de pérdidas, utiliza la pestaña **Historial**:
* **Visor de Historial:** Contiene una tabla con todas las entregas y retornos históricos registrados.
* **Filtros e Historial:** Puedes ordenar la tabla por fecha, nombre de equipo o ingeniero, y filtrar usando el buscador de texto en tiempo real.
* **Estados de Custodia:**
  * *En Uso (Resaltado en amarillo):* Las herramientas siguen en campo bajo custodia del ingeniero.
  * *Devuelto (Resaltado en verde):* Las herramientas ya retornaron al almacén y el stock está libre nuevamente.
* **Detalle Temporal:** La tabla registra el segundo exacto en que se entregó el equipo y el segundo exacto en que se recibió de vuelta, permitiendo deslindar responsabilidades ante daños o pérdidas.
