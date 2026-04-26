# TASKLIST UI

Checklist de mejoras de interfaz para ejecutar de forma incremental.

## Estado

- [x] Crear tasklist inicial para mejoras UI.
- [x] Definir criterio visual objetivo (tipografia, color, espaciado, componentes base).
- [x] Auditar pantallas clave de UI actual (auth, dashboard, consultas, pacientes, ajustes).
- [x] Priorizacion de mejoras por impacto/esfuerzo.

## Backlog Activo

- [x] Mejoras de Login y Registro.
- [x] Mejoras del Layout de Dashboard.
- [x] Mejoras del flujo de Consultas (wizard por pasos).
- [x] Mejoras de pantalla de Pacientes.
- [x] Mejoras de Ajustes.
- [x] Consistencia de botones, inputs, estados vacios, alerts y modales.
- [x] Responsive y accesibilidad visual (contraste, foco, legibilidad).
- [x] Corregir texto con comillas sin escapar en panel de sync para cumplir `react/no-unescaped-entities`.

## Ruta Refactor UI/UX

### Fase 1 - Diagnostico Visual

- [ ] Auditar pantallas clave con captura/nota de problemas visuales reales.
- [ ] Detectar incoherencias de jerarquia, espaciado, color y densidad de informacion.
- [ ] Separar componentes que mezclan logica y presentacion.

### Fase 2 - Sistema de Diseno

- [ ] Definir tokens finales de color, tipografia, bordes, sombras y estados.
- [ ] Unificar superficies, botones, inputs, alerts, chips y modales.
- [ ] Establecer reglas mobile-first y dark mode coherentes.

### Fase 3 - Patrones de UI

- [ ] Reestructurar pantallas con Container / Presentational.
- [ ] Extraer hooks de estado y validacion de formularios complejos.
- [ ] Convertir bloques repetidos en componentes atomicos reutilizables.

### Fase 4 - Pantallas Criticas

- [ ] Redisenar Home, Login y Registro con una identidad visual mas fuerte.
- [ ] Simplificar Dashboard para que priorice acciones y estado clinico.
- [ ] Rehacer Consultas y Pacientes con flujo mas claro y menos friccion.
- [ ] Redisenar Ajustes como centro unico de perfil profesional y membrete.

### Fase 5 - QA Visual

- [ ] Revisar accesibilidad visual con teclado, contraste y foco visible.
- [ ] Probar consistencia en mobile, desktop y pantallas intermedias.
- [ ] Cerrar con un pase de lint, typecheck, tests y validacion visual.

## Flujo de Trabajo

- [x] Recibir requerimiento puntual de UI.
- [x] Implementar cambio en codigo.
- [x] Validar con lint/typecheck/tests segun aplique.
- [x] Marcar tarea completada y registrar siguiente.

## Log de Cambios

- [x] 2026-04-23: Home (/) convertida en portal de acceso con enfoque login y branding Glyph.
- [x] 2026-04-23: Pulido visual del formulario de acceso y consistencia de copy en registro.
- [x] 2026-04-23: UX login mejorada con mostrar/ocultar contraseña, validaciones inline y prioridad del formulario en móvil.
- [x] 2026-04-23: Registro mejorado con selector múltiple usable (checkbox + búsqueda) y clinic_id oculto/autogenerado.
- [x] 2026-04-23: Selector de especialidades actualizado a chips interactivos con búsqueda y remoción rápida.
- [x] 2026-04-24: Auditoria de pantallas clave y repriorizacion por impacto/esfuerzo alineada con TASKLIST.md.
- [x] 2026-04-24: Pass de consistencia UI con clases base globales para botones, inputs, alerts, chips, modales y estados vacios.
- [x] 2026-04-24: Mejora de accesibilidad base (focus-visible global, reduced-motion, targets tactiles) y cierre de logout visible en desktop/mobile.
- [x] 2026-04-26: Criterio visual objetivo definido con superficies card-based, jerarquia clinica clara y soporte dark mode por tokens.
- [x] 2026-04-26: Dashboard redisenado con superficies tematicas, resumen del dia mas claro y accesos rapidos unificados.
- [x] 2026-04-26: Flujo de consultas redisenado con progreso por pasos, cards tematicas y controles de entrada unificados.
- [x] 2026-04-26: Pacientes alineado con las superficies y controles compartidos de la app para mantener coherencia visual.
- [x] 2026-04-26: Ajustes unificado con Perfil Profesional en un formulario compartido para evitar el redirect stub.
- [ ] 2026-04-26: Iniciada ruta de refactor UI/UX por fases para rehacer la experiencia visual completa.

## Notas

- Iremos moviendo tareas a completadas conforme avances.
- Si quieres, puedo agregar tambien severidad/prioridad por cada item (Alta/Media/Baja).
