# Guía de Usuario: Ingeniero - FIMAGADI

Bienvenido a la guía oficial de usuario para el perfil de **Ingeniero**. Esta guía exhaustiva describe detalladamente las herramientas, vistas y operaciones que tienes asignadas en el dashboard de FIMAGADI para cumplir con tus labores diarias de control de asistencia, rendición de cuentas, custodia de activos y gestión de expedientes de socios en obra.

---

## 1. Registro de Asistencia (Jornada)
El módulo de **Jornada** es tu herramienta para registrar tus horas de ingreso y salida diaria. El sistema valida tu hora de registro contra los límites configurados por la empresa:

* **Marcar Entrada:**
  1. Al iniciar tus labores diarias, ingresa a la sección **Jornada**.
  2. Haz clic en el botón **Marcar Entrada**.
  3. *Control de Retrasos:* Si marcas tu ingreso después de la hora máxima permitida, el sistema te solicitará ingresar una **Justificación** en texto (ej. *"Retraso por tráfico en la autopista de acceso"*). Esta justificación será revisada por el Administrador.
* **Marcar Salida:**
  1. Al concluir tu jornada de trabajo, ingresa nuevamente al módulo.
  2. Haz clic en el botón **Marcar Salida**.

---

## 2. Solicitud de Fondos (Presupuestos Operativos)
Cuando necesites viajar a una obra o realizar compras operativas menores en campo, debes solicitar fondos con anticipación a la administración:

1. Ingresa a la sección **Presupuestos** en el menú izquierdo.
2. Haz clic en el botón **Solicitar Fondos** (esquina superior derecha).
3. Completa los campos solicitados de manera precisa:
   * **Motivo:** Detalla el propósito del presupuesto (ej. *"Viaje a Obra Norte - Combustible, viáticos de alimentación y hospedaje"*).
   * **Monto Estimado:** Digita la cantidad estimada necesaria en Soles.
4. Presiona **Enviar Solicitud**. 
5. Tu solicitud quedará en estado `Pendiente`. Podrás revisar el historial aquí mismo y verás cuando cambie a `Aprobado` una vez que el Administrador autorice el presupuesto y te asigne tu saldo por rendir.

---

## 3. Rendición y Registro de Gastos (Expenses)
El sistema te permite registrar gastos bajo dos modalidades diferentes:

* **Modalidad A: Gasto Vinculado a Presupuesto (Rendición)**
  * **Cuándo usarlo:** Cuando realizas un gasto utilizando el dinero operativo que la empresa ya te transfirió previamente.
  * **Cómo registrarlo:** Llena el formulario e ingresa el monto, fecha y descripción. En el campo **"Vincular a Presupuesto"**, selecciona tu presupuesto activo correspondiente. Esto descontará automáticamente el gasto del saldo de tu presupuesto para justificarlo ante la administración.
  
* **Modalidad B: Gasto General / A Solicitud (Sin Presupuesto / Reembolsable)**
  * **Cuándo usarlo:** Cuando realizas un gasto de tu propio bolsillo en campo (gasto reembolsable) o cuando solicitas el pago directo de un gasto específico que no estaba contemplado en un presupuesto global previo.
  * **Cómo registrarlo:** Llena el formulario normalmente y deja el selector de **"Vincular a Presupuesto"** marcado como **"Ninguno"**. Al aprobarse por la administración, este gasto se gestionará para tu posterior reembolso.

### Pasos detallados para registrar cualquier Gasto:
1. Ingresa a la sección **Gastos**.
2. Haz clic en **Registrar Gasto** y completa el formulario:
   * **Monto:** Digita el valor exacto de la compra en Soles.
   * **Fecha:** Selecciona el día en que se realizó la transacción.
   * **Categoría:** Elige entre *Viáticos* (alimentación, transporte, hospedaje, etc.) o *Otros*.
   * **Descripción:** Detalla el concepto del gasto (ej. *"Cena de coordinación de obra"*).
   * **Vincular a Presupuesto (Opcional):** Elige tu presupuesto activo (Modalidad A) o déjalo en **"Ninguno"** (Modalidad B) según sea el caso.
3. **Sustento del Gasto:**
   * **Con comprobante:** Sube la foto o PDF de la boleta de venta o factura.
   * **Sin comprobante (Declaración Jurada):** Si compraste en un lugar que no emite comprobantes autorizados (ej. menús en zonas rurales alejadas), marca la casilla **"Gasto sin comprobante (Declaración Jurada)"**. Lee con atención la declaración de responsabilidad y guárdalo.
4. Presiona **Guardar Gasto**. La solicitud de gasto se enviará a la administración para su verificación y aprobación final.

---

## 4. Control de Equipos en Custodia (Inventario)
En la sección **Inventario** puedes monitorear en tiempo real todos los activos y consumibles que el **Encargado de Inventario** te ha entregado en custodia:

* **Equipos Asignados:** Revisa la tabla de la derecha para verificar que los GPS, winchas, drones u otros dispositivos que tienes físicamente coincidan exactamente con el registro del sistema.
* **Devolución de Equipos:** Al retornar un activo al almacén central, asegúrate de que el **Encargado de Inventario** registre la devolución en el sistema para liberar la custodia a tu nombre.

---

## 5. Expedientes y Lotes (Documentos)
El módulo de **Documentos** te permite gestionar la planimetría y el estado físico de los lotes de los socios en la zona del proyecto:

* **Búsqueda Eficiente:** Puedes buscar socios rápidamente por Nombre, DNI, Manzana (ej. *"mz B"*) o Lote (ej. *"lt 5"*).
* **Filtro de Ubicación:** Selecciona el **Distrito** en el combobox para filtrar automáticamente los socios de esa jurisdicción. Al cambiar de distrito, el filtro de localidades se reiniciará para facilitar la búsqueda.
* **Control de Medición:** Si realizaste la medición física de un lote:
  * **Individual:** Abre la ficha del socio y activa la casilla de lote medido.
  * **Masiva:** Selecciona varios socios usando las casillas de verificación de la tabla y haz clic en **Acciones -> Marcar como Medido**.
* **Subida de Archivos:** Dentro del expediente de cada socio, puedes cargar en PDF o Imagen sus **Planos de ubicación** y su **Memoria descriptiva**.
