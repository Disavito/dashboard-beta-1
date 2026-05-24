# Guía de Usuario: Encargado de Inventario - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Encargado de Inventario**. Este rol (el cual puede ser ejercido por el Administrador o cualquier colaborador con el permiso personalizado `can_manage_inventory`) es responsable directo del resguardo, asignación y recepción de todas las herramientas técnicas, consumibles y activos fijos asignados al personal para salidas a campo (tales como drones de topografía, GPS, laptops de obra, winchas métricas, equipos de protección, etc.).

---

## 1. Registro y Control del Catálogo de Equipos

El catálogo centralizado (`inventory_items`) almacena todos los tipos de activos disponibles en la empresa.

### Crear un Nuevo Activo en Almacén:
1. Ingresa a la sección de **Inventario** y ve a la pestaña **Catálogo**.
2. Haz clic en el botón **Nuevo Equipo** (disponible en la esquina superior derecha si tienes los permisos habilitados).
3. Completa los siguientes campos en el formulario:
   * **Nombre:** El identificador claro del activo (ej. *GPS Diferencial Leica*).
   * **Descripción (Opcional):** Talla, color, marca, modelo o número de serie (ej. *Modelo GS18, Color Rojo, Talla M*).
   * **Stock Inicial:** La cantidad total de unidades disponibles que se ingresarán físicamente al almacén.
4. Presiona **Guardar**. El sistema registrará el activo y calculará automáticamente las cantidades:
   * `total_quantity`: Stock físico absoluto de la empresa.
   * `available_quantity`: Stock disponible en almacén para ser asignado.

*Nota:* Si un activo queda obsoleto o es dado de baja, puedes hacer clic en el botón **Eliminar** (ícono de tacho de basura) que aparece al posicionar el cursor sobre la tarjeta del equipo en la pestaña de catálogo (aplicando un borrado lógico en la columna `deleted_at`).

---

## 2. Salida de Equipos a Campo (Checkout Multi-ítem)

Cuando un ingeniero o técnico se traslade a campo, debes registrar la salida de los equipos a su nombre antes de que se retiren de la oficina.

### Flujo de Registro de Salida:
1. Haz clic en **Registrar Salida** en el panel de inventario.
2. **Seleccionar Colaborador:** Elige de la lista desplegable al Ingeniero o colaborador responsable de la custodia de los equipos.
3. **Seleccionar Equipos (Salida Multi-ítem):**
   * El sistema te permite registrar múltiples herramientas de una sola vez.
   * Elige un equipo de la lista (el sistema te mostrará la cantidad disponible entre paréntesis).
   * Define la **Cantidad** exacta que se está llevando.
   * Si lleva más herramientas, haz clic en **+ Agregar otro equipo** y repite el proceso.
4. **Observaciones:** En el campo observaciones, anota el proyecto de destino o el estado físico de entrega de las herramientas (ej. *"Se entrega con batería al 100% y cargador original"*).
5. **Procesamiento de Base de Datos (RPC checkout_equipment):** 
   * Al hacer clic en **Confirmar Salida**, el sistema invoca de forma segura la función atómica `checkout_equipment` de Supabase.
   * *Evitación de Condiciones de Carrera:* La base de datos bloquea temporalmente las filas seleccionadas de la tabla `inventory_items` mediante un bloqueo `FOR UPDATE` para asegurarse de que el stock no sea asignado en paralelo por otro usuario.
   * Si hay stock disponible, el sistema decrementa automáticamente la columna `available_quantity` de cada ítem y crea los registros en la tabla `inventory_assignments` con estado `'En Uso'`.

---

## 3. Recepción y Devolución de Herramientas

Al retornar de campo, los colaboradores deben entregar las herramientas. Es de vital importancia registrar la recepción en el sistema de inmediato para liberar de responsabilidad al ingeniero y restablecer las unidades en almacén.

### Modalidad A: Devolución Individual
1. En la pestaña **Equipos en Campo**, ubica al Ingeniero y el equipo que está devolviendo.
2. Haz clic en el botón **Devolver** ubicado a la derecha de la herramienta.
3. El sistema actualizará el estado de la asignación a `'Devuelto'`, escribirá la marca temporal de retorno en `returned_at` y sumará automáticamente la cantidad correspondiente al stock disponible (`available_quantity`) en la tabla de catálogo.

### Modalidad B: Recepción Total (Recepción Masiva por Colaborador)
Si el ingeniero retorna con todas las herramientas asignadas y deseas recibirlas de golpe para ahorrar tiempo:
1. Haz clic en el botón **Recepción Total** (en la esquina superior derecha del panel).
2. Selecciona al Ingeniero en la lista desplegable. El sistema mostrará un cuadro resumen en gris con todos los equipos que el colaborador tiene asignados actualmente en campo.
3. Verifica físicamente que estén completos y en buen estado.
4. Haz clic en **Confirmar Devolución**. La base de datos ejecutará el retorno masivo (`returnAllByColaborador`), restableciendo el stock disponible de todos los ítems involucrados y cerrando las asignaciones activas.

---

## 4. Historial y Auditoría de Almacén

Para auditorías o controles periódicos de pérdidas, utiliza la pestaña **Historial**:
* **Visor Ag-Grid:** El historial de movimientos cuenta con un panel avanzado utilizando AG-Grid React.
* **Funciones del Visor:** Puedes ordenar haciendo clic en las cabeceras de las columnas (Equipo, Ingeniero, Cantidad, Salida, Retorno, Estado) y aplicar filtros textuales en tiempo real.
* **Estados del Registro:**
  * `En Uso` (Resaltado en amarillo): El equipo sigue en manos del ingeniero en campo.
  * `Devuelto` (Resaltado en verde): El equipo ya retornó al almacén y el stock fue reincorporado.
* **Detalle Temporal:** El panel guarda con precisión el segundo exacto del checkout y del checkin para deslindar responsabilidades en caso de daños o pérdidas de activos.
