# Guía de Usuario en el Dashboard: Finanzas - FIMAGADI

Bienvenido al manual operativo de usuario para el perfil de **Finanzas**. Este documento detalla de manera exhaustiva el funcionamiento del **Dashboard de FIMAGADI** para tu rol, indicando a qué módulos ingresar, qué botones presionar, qué opciones seleccionar y cómo realizar el control de recaudaciones y declaraciones electrónicas dentro de la plataforma.

---

## 1. Módulo de Recaudación (Ingresos)

Esta sección permite registrar las aportaciones de los socios y emitir sus comprobantes:

* **Dónde ir:** En el menú izquierdo, haz clic en **Ingresos**.
* **Cómo Registrar una Aportación:**
  1. Haz clic en el botón **Registrar Ingreso** (esquina superior derecha).
  2. En el buscador de socios, escribe el DNI o nombres del socio y selecciónalo en el listado desplegable.
  3. Rellena los datos en el formulario:
     * **Monto:** Escribe el valor exacto recibido.
       * *Regla para Socios de Extrema Pobreza:* Si el socio califica bajo esta condición, no se recibe efectivo, pero debes registrar obligatoriamente el ingreso digitando **Monto: 0.00**. Esto regulariza su estado en el padrón sin alterar la contabilidad de caja.
     * **Cuenta:** Selecciona la cuenta bancaria de destino (BBVA, BCP, Efectivo).
     * **Tipo de Transacción:** Elige la vía de pago (Efectivo, Depósito, Transferencia).
     * **Número de Operación:** Digita el código de confirmación del depósito bancario.
     * **Fecha:** Selecciona el día en que se realizó la operación.
  4. Haz clic en **Guardar**.
  5. **Comprobante Digital:** El sistema asignará el número de recibo de inmediato y abrirá una pestaña del navegador con el recibo en PDF para que lo descargues o imprimas de forma directa.
* **Cómo Revertir o Modificar un Ingreso:**
  * Si registraste un aporte por error y necesitas anularlo, ubica la fila del recibo en la tabla, haz clic en **Eliminar** (Tacho rojo) e ingresa de forma obligatoria el motivo de la anulación. Esto creará una solicitud de anulación para aprobación del Administrador.

---

## 2. Módulo de Cuentas y Tesorería (Conciliaciones y Caja)

Este panel sirve para supervisar el flujo de efectivo y emitir cierres contables:

* **Dónde ir:** En el menú izquierdo, haz clic en **Cuentas**.
* **Gráficas e Indicadores:**
  * En la parte superior, visualiza los indicadores de Saldo Neto, Ingresos y Gastos.
  * Cambia la agrupación del gráfico de flujo haciendo clic en las pestañas **Día**, **Mes**, **Trimestre** o **Año**.
* **Filtros de Historial Unificado:**
  * En la tabla de transacciones de la parte inferior, filtra la lista abriendo los selectores **Todos los tipos** (de cuentas) o **Todas las cuentas** y eligiendo la cuenta a conciliar.
  * Utiliza la barra de búsqueda de la tabla para buscar por nombre del socio o número de recibo/operación.
* **Descargar Cierre de Caja:**
  * Una vez filtrada la tabla con los datos que deseas conciliar, haz clic en el botón **Reporte PDF (Cierre)**. El sistema descargará automáticamente el documento consolidado en formato PDF.
* **Registro de Movimientos Administrativos Directos:**
  * **Qué hacer:** Si necesitas registrar un gasto propio de la oficina (ej. alquileres, luz, planillas), haz clic en el botón **Nuevo Movimiento** en este panel.
  * **Qué ocurre:** Completa el formulario de egresos. Si seleccionas la categoría *Gasto Fijo* o subcategoría *Sueldo*, el sistema omitirá la cola de autorizaciones y restará el dinero de la cuenta de forma automática e inmediata (gasto auto-aprobado).

---

## 3. Módulo de Resúmenes Diarios y Bajas (SUNAT)

Este módulo gestiona la declaración tributaria de las boletas del día ante la SUNAT de forma electrónica:

* **Dónde ir:** En el menú lateral, bajo Facturación, haz clic en **Resúmenes Diarios**.
* **Declarar Boletas del Día:**
  1. En el selector de fecha del calendario, elige el día de las transacciones que deseas declarar.
  2. Haz clic en el botón **Generar Resumen del Día**. Revisa el listado consolidado que se muestra en pantalla.
  3. Haz clic en **Enviar Resumen a SUNAT**.
  4. El sistema transmitirá los datos e insertará el número de **Ticket** oficial en la tabla de historial.
* **Seguimiento del Envío:**
  * Revisa la tabla del historial de envíos de la parte inferior de la pantalla para monitorear el estado devuelto por la SUNAT:
    * `Aceptado` (Etiqueta verde): Envío exitoso, la declaración ha sido procesada de forma conforme.
    * `Rechazado` (Etiqueta roja): Error en los comprobantes; debes re-evaluar y re-enviar.
    * `Pendiente` (Etiqueta amarilla): Envío en cola de procesamiento.

---

## 4. Bandeja de Aprobaciones Pendientes (Gastos)

Esta bandeja te permite autorizar la salida de fondos reportada por el equipo de campo:

* **Dónde ir:** En el menú izquierdo, haz clic en **Aprobaciones Pendientes**.
* **Cómo procesar:**
  1. Revisa las solicitudes de egresos cargadas por los ingenieros.
  2. Haz clic en **Ver Comprobante** para comprobar que el sustento digital coincida con el monto registrado, o valida los detalles si es una Declaración Jurada.
  3. Si la solicitud es correcta, haz clic en **Aprobar** para que el egreso (representado con valor negativo) se consolide en el sistema de cuentas de tesorería y reste del presupuesto correspondiente. Si detectas fallos, haz clic en **Rechazar**.
