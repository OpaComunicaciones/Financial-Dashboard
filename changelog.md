# Changelog

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
