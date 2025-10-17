# Changelog

## [2025-10-14 14:00:00]

- **Feature:** Añadida la opción de "Planificable" para los tipos de ingresos y egresos.
  - En "Configuración", ahora se puede marcar qué conceptos son planificables.
  - La página de "Planificación" solo mostrará las filas de los conceptos marcados como planificables.
- **UX:** La columna de "Categoría" en la página de Planificación ahora es fija (sticky) para mejorar la usabilidad al hacer scroll horizontal.

## [2025-10-14 12:00:00]

- **Feature:** Mejoras significativas en los informes de P&G y Egresos.
  - **Informe de P&G:**
    - El cálculo de gastos ahora se basa en el **principio de devengo**, incluyendo facturas por pagar para mayor precisión.
    - Se corrigió la duplicación de "Ventas Directas" en efectivo.
    - Añadida una columna de análisis vertical (%) para todas las partidas.
  - **Informe de Egresos:**
    - Añadida la opción de visualización **Agrupado/Detallado**.
    - Implementado filtro para gastos **No Deducibles**.
    - Agregada una columna de análisis vertical (`% vs Ingresos`).
    - El cálculo de gastos ahora también se basa en el principio de devengo.
- **Feature:** Añadida una sección de totales por forma de pago en el historial de "Ventas Diarias".
- **i18n:** Actualizadas las traducciones para las nuevas funcionalidades.

## [2025-10-14 10:00:00]

- **i18n:** Se actualizó la traducción de los términos 'surplus' (Sobrante) y 'shortage' (Faltante) en la sección de Caja Diaria y los informes correspondientes.

## [2025-10-13 16:00:00]

- **UX:** Las listas desplegables de conceptos de ingresos y egresos ahora se ordenan alfabéticamente en toda la aplicación para mejorar la usabilidad.

## [2025-10-13 15:00:00]

- **Feature:** Implementado un selector de rango de fechas dinámico en el Dashboard.
  - Todas las métricas y gráficos del dashboard ahora se actualizan según el período seleccionado (Hoy, Últimos 7/30/90 días, o personalizado).
  - El gráfico de ventas ahora muestra los datos para todo el período seleccionado.

## [2025-10-13 13:00:00]

- **Feature:** Mejoras importantes en el informe de "Control de Egresos".
  - Se reemplazó el gráfico de pastel por un gráfico de barras horizontales para mayor claridad.
  - El informe ahora consolida tanto los gastos de caja como los de banco.
  - Se añadió una tabla con el desglose detallado de cada egreso.
  - Se implementó la visualización de gastos no deducibles.
  - Se añadió un filtro para mostrar solo los gastos no deducibles.
- **Fix:** Se renombró la pestaña del informe a "Control de Egresos".
- **UX:** Se corrigió el color del texto en el tooltip del gráfico para mejorar el contraste y la legibilidad.

## [2025-10-13 12:00:00]

- **Feature:** Añadida la función de "Reiniciar Base de Datos" en la página de Configuración.
  - Creada una "Zona Peligrosa" para acciones destructivas.
  - Implementado un modal de confirmación para evitar el borrado accidental de datos.

## [2025-10-13 11:00:00]

- **Feature:** Asignado el concepto "Ventas Directas" a las ventas diarias registradas con tarjeta o transferencia en el módulo de bancos.
  - La descripción de la transacción mantiene el detalle del origen (tarjeta o transferencia) y la fecha.

## [2025-10-13 10:00:00]

- **Fix:** Se corrigió un `ReferenceError` en el módulo de Bancos (`pages/Banks.tsx`) al reordenar la inicialización de funciones. Esto resuelve un error que ocurría al ver la página de bancos.