# Changelog

## [2025-10-22 22:00:00]

- **Feature:** Implementado el módulo completo de Cuentas por Cobrar (Accounts Receivable).
  - **Estructuras de Datos**: Se añadieron nuevos tipos para `Deudor` (Plataforma de delivery, Cliente, Empleado) y `CuentaPorCobrar` (con pagos parciales, consolidados y comisiones).
  - **Gestión de Deudores**: Nueva sección en la página "Cuentas por Cobrar" para añadir, editar y eliminar deudores.
  - **Gestión de Cuentas por Cobrar**: Listado, filtrado y adición manual de cuentas por cobrar.
  - **Integración con Ventas Diarias**: Nueva sección en la página "Ventas Diarias" para registrar ventas a plataformas/crédito, que automáticamente crean entradas en Cuentas por Cobrar.
  - **Sistema Avanzado de Pagos**: Nuevo modal "Registrar Pago Entrante" que permite aplicar un solo pago a múltiples cuentas por cobrar, manejar pagos parciales y registrar comisiones automáticamente.
- **Refactor**: Mejora significativa en la precisión del "Estado de Resultados (P&G)" y "Ventas Diarias".
  - Se introdujo el concepto de gastos "Deducibles de Ventas" (`isDeductibleFromSales`) en los tipos de egreso.
  - El cálculo de ventas netas ahora considera gastos deducibles, excedentes de caja y ajustes fiscales, proporcionando una visión más precisa de la rentabilidad.
  - Se creó la utilidad `utils/calculations.ts` para centralizar la lógica de cálculo de ventas netas diarias.
- **i18n:** Añadidas todas las traducciones necesarias para el nuevo módulo en español e inglés.

## [2025-10-22 21:00:00]

- **Feature:** Implementado el módulo completo de Cuentas por Cobrar (Accounts Receivable).
  - **Estructuras de Datos**: Se añadieron nuevos tipos para `Deudor` (Plataforma de delivery, Cliente, Empleado) y `CuentaPorCobrar` (con pagos parciales, consolidados y comisiones).
  - **Gestión de Deudores**: Nueva sección en la página "Cuentas por Cobrar" para añadir, editar y eliminar deudores.
  - **Gestión de Cuentas por Cobrar**: Listado, filtrado y adición manual de cuentas por cobrar.
  - **Integración con Ventas Diarias**: Nueva sección en la página "Ventas Diarias" para registrar ventas a plataformas/crédito, que automáticamente crean entradas en Cuentas por Cobrar.
  - **Sistema Avanzado de Pagos**: Nuevo modal "Registrar Pago Entrante" que permite aplicar un solo pago a múltiples cuentas por cobrar, manejar pagos parciales y registrar comisiones automáticamente.
- **i18n:** Añadidas todas las traducciones necesarias para el nuevo módulo en español e inglés.

## [2025-10-22 20:00:00]

- **Fix:** Corregido un error de zona horaria en el Panel de Declaración de Impuestos. Las ventas del primer día de un período fiscal ya no se atribuyen incorrectamente al período anterior. Todos los cálculos de fechas ahora se manejan en UTC para garantizar la consistencia.
- **Fix:** Solucionado un error de sintaxis (`Unterminated string constant`) que impedía la carga de la aplicación después de la corrección anterior.

## [2025-10-22 19:00:00]

- **Feature:** Implementada la configuración de la API Key de Gemini para habilitar el análisis financiero con IA.
  - Se añadió una sección en "Configuración" para que el usuario pueda introducir y guardar su propia clave de API de Gemini.
- **Refactor:** El servicio de IA (`geminiService`) fue reestructurado para usar la clave de API desde la configuración de la aplicación, en lugar de depender de variables de entorno.
- **Fix:** Solucionado un error crítico de dependencias al reemplazar el paquete no oficial `@google/genai` por el paquete oficial `@google/generative-ai`.
- **Fix:** Corregidos múltiples errores de `ReferenceError` y `TypeError` durante la inicialización y llamada a la API de Gemini, asegurando que la integración funcione correctamente.
- **UX:** Mejorado el manejo de errores en el panel de análisis de IA. Ahora se muestran mensajes claros si la clave de API es inválida o si ocurre un problema de conexión, en lugar de quedarse en un estado de "cargando" infinito.

## [2025-10-22 18:00:00]

- **Feature:** Overhauled the tax management system with a new, comprehensive workflow.
  - **Tax Configuration**: Added 'Payment Frequency' (monthly, bimonthly, etc.) to tax settings, replacing the old numeric frequency.
  - **Tax Declaration Panel**: Implemented a new panel in "Accounts Payable" that calculates and displays tax obligations for distinct fiscal periods based on sales data.
  - **Period-Based Invoicing**: Users can now generate specific tax invoices for each declaration period directly from the panel.
  - **Retroactive Adjustments**: The system now automatically detects changes to sales in previously invoiced periods and creates "adjustment" entries for the difference. This ensures perfect traceability.
  - **Adjustment Invoicing**: Added the ability to generate separate invoices for tax adjustments.
- **i18n:** Added Spanish and English translations for all new UI elements related to the tax system.
- **Fix:** Corrected a `ReferenceError` on the "Accounts Payable" page caused by a missing `Card` component import during a previous refactor.

## [2025-10-14 20:00:00]

- **Feature:** Implementado un sistema de bloqueo y edición para el "Cierre de Caja Diario".
  - Los cierres guardados ahora aparecen bloqueados (solo lectura).
  - Se requiere un botón de "Editar" para modificar un cierre existente.
- **Feature:** Añadida una regla de negocio que impide navegar a un día futuro si el cierre de caja del día actual no está cuadrado.
- **Fix:** Corregido un error en la regla anterior que leía el valor guardado en lugar del valor en pantalla para la validación.
- **Fix:** Eliminada una dependencia de la moneda "USD" en la página de Informes. Ahora muestra un mensaje si no hay monedas configuradas.

## [2025-10-14 19:00:00]

- **Feature:** Añadida una fila de totales para las secciones de Ingresos y Egresos en el informe de "Real vs. Presupuesto".

## [2025-10-14 18:00:00]

- **Feature:** Mejorada la exportación a PDF en todos los informes para generar documentos completos y paginados que no se cortan, usando la librería jsPDF.
- **Fix:** Corregido un error en el "Informe de Análisis de Ventas" que atribuía las ventas al día incorrecto por problemas de zona horaria.
- **Fix:** Solucionado un error en el "Informe de Flujo de Caja" que duplicaba el conteo de los pagos de facturas.
- **Fix:** Corregido un error de inicialización que impedía la carga del "Informe de Bancos".
- **UX:** Mejorada la legibilidad de los informes de Flujo de Caja y P&G, mostrando solo los nombres de los conceptos y ordenándolos alfabéticamente.

## [2025-10-14 17:00:00]

- **Feature:** Mejorada la exportación del informe P&G a un archivo `.xlsx` con formato.
- **UX:** Añadido el logo y texto "Developed by" en la barra lateral.

## [2025-10-14 16:00:00]

- **Feature:** Mejorado el "Informe de Flujo de Caja" para discriminar entre movimientos de caja y de bancos.
  - Las secciones de Entradas y Salidas ahora se subdividen en "Caja" y "Bancos".
  - Se corrigió la lógica para incluir correctamente todas las ventas y pagos de facturas.
- **Feature:** Mejorada la usabilidad de la página de "Planificación".
  - Las celdas de presupuesto ahora son más fáciles de leer y editar, mostrando el valor formateado por defecto y convirtiéndose en un campo de input al hacer clic.
- **Fix:** Eliminado el símbolo de moneda hardcodeado del título de la columna "Varianza" en el informe de "Real vs. Presupuesto".

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