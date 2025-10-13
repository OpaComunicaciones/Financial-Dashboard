# Changelog

## [2025-10-13 13:00:00]

- **Feature:** Mejorado el informe de "Control de Egresos".
  - El informe ahora incluye tanto gastos de caja como de banco.
  - Añadida una tabla con el desglose de cada egreso.
  - Implementada la visualización de gastos no deducibles.
  - Añadido un filtro para mostrar solo los gastos no deducibles.
- **Fix:** Renombrada la pestaña del informe a "Control de Egresos".

## [2025-10-13 12:00:00]

- **Feature:** Añadida la función de "Reiniciar Base de Datos" en la página de Configuración.
  - Creada una "Zona Peligrosa" para acciones destructivas.
  - Implementado un modal de confirmación para evitar el borrado accidental de datos.

## [2025-10-13 11:00:00]

- **Feature:** Asignado el concepto "Ventas Directas" a las ventas diarias registradas con tarjeta o transferencia en el módulo de bancos.
  - La descripción de la transacción mantiene el detalle del origen (tarjeta o transferencia) y la fecha.

## [2025-10-13 10:00:00]

- **Fix:** Se corrigió un `ReferenceError` en el módulo de Bancos (`pages/Banks.tsx`) al reordenar la inicialización de funciones. Esto resuelve un error que ocurría al ver la página de bancos.