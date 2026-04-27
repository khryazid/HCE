# Análisis final de HCE

Fecha de revisión: 27 de abril de 2026.

## Resumen ejecutivo

La app tiene una base técnica bastante sólida: arquitectura offline-first, tenant isolation, flujo clínico funcional, componentes clínicos reales y un sistema visual ya más coherente que en iteraciones previas. La deuda actual no está tanto en si funciona, sino en cuánto esfuerzo costará mantenerla, escalarla y confiar en ella en producción.

Mis tres focos principales son:

1. robustez de sincronización y manejo de errores,
2. seguridad y observabilidad de la API de sugerencias CIE,
3. exceso de lógica concentrada en hooks y formularios grandes, con duplicación de fuentes de verdad.

## Lo que está bien

- Hay separación real entre autenticación, dashboard, consultas, pacientes y ajustes.
- La base offline-first está bien planteada y no parece un prototipo superficial.
- El sistema visual ya usa tokens consistentes en gran parte de la app.
- Hay tests existentes para varias piezas críticas.
- El flujo clínico principal ya existe y es usable.

## Hallazgos principales

### 1. Sincronización: riesgo de reintentos repetitivos y recuperación frágil

Archivo clave: [lib/sync/sync-worker.ts](lib/sync/sync-worker.ts)

El worker sí incrementa `retry_count`, pero la recuperación sigue siendo vulnerable a bucles de reintento y a un comportamiento poco predecible cuando falla una subida repetidamente. Además, la cola mezcla `pending` y `failed` en cada flush, así que una condición persistente puede volver a golpear el mismo lote con mucha frecuencia.

Qué haría:

- introducir backoff real por item,
- diferenciar claramente `failed` temporal de `dead-letter`,
- registrar motivo y momento del último fallo de forma más estructurada,
- añadir pruebas para fallos transitorios y permanentes.

### 2. API CIE: buena intención, pero falta endurecer fallos y observabilidad

Archivo clave: [app/api/cie-suggestions/route.ts](app/api/cie-suggestions/route.ts)

La ruta ya valida Bearer token y recorta entradas, lo cual está bien. El problema es de robustez operacional: el rate limit vive en memoria del proceso y no escala bien entre instancias, y cualquier error termina devolviendo una respuesta 200 con fallback local. Eso oculta fallos reales, complica monitoreo y puede enmascarar problemas de infraestructura o de Gemini.

Qué haría:

- mover rate limiting a un store compartido,
- separar fallos de negocio, auth y proveedor externo,
- no convertir todos los errores internos en 200,
- añadir métricas o logs estructurados para saber cuándo cae al catálogo local.

### 3. Wizard clínico demasiado grande

Archivo clave: [lib/consultations/use-consultation-wizard.ts](lib/consultations/use-consultation-wizard.ts)

El hook concentra demasiadas responsabilidades: carga de datos, borradores, selección de paciente, sugerencias CIE, plantillas de tratamiento, validación, PDF y persistencia. Eso hace que cualquier cambio toque demasiadas cosas y dificulta testearlo por partes.

Qué haría:

- separar en hooks más pequeños por responsabilidad,
- mover lógica de dominio a helpers puros,
- dejar el hook principal como orquestador,
- extraer validaciones y derivaciones de estado.

### 4. Perfil profesional duplicado en onboarding y ajustes

Archivos clave: [app/(dashboard)/onboarding/page.tsx](app/(dashboard)/onboarding/page.tsx), [app/(dashboard)/ajustes/page.tsx](app/(dashboard)/ajustes/page.tsx), [components/ui/professional-profile-form.tsx](components/ui/professional-profile-form.tsx)

La misma base de perfil profesional se usa en dos pantallas que hoy se solapan bastante. Eso no es un bug crítico, pero sí una incoherencia de producto: el usuario puede no entender cuál es la fuente de verdad y el código replica el mismo problema conceptual en dos rutas distintas.

Qué haría:

- definir una única pantalla canónica para perfil/membrete,
- convertir la otra en acceso contextual o en sub-sección,
- unificar copy, feedback y comportamiento post-guardado.

### 5. Documentación y estado del producto todavía se desalinean

Archivos clave: [README.md](README.md), [TASKLIST.md](TASKLIST.md), [TASKLIST_UI.md](TASKLIST_UI.md)

La documentación ya está mejor que antes, pero sigue arrastrando notas de iteraciones previas y tareas marcadas como completas aunque todavía hay deuda técnica relevante alrededor de sincronización, trazabilidad y separación de responsabilidades. No es un problema de ejecución, pero sí de gobernanza del proyecto.

Qué haría:

- limpiar el backlog de items ya obsoletos,
- separar hecho de hecho pero mejorable,
- actualizar README con el estado real de cada módulo,
- mantener un changelog de deuda técnica viva.

### 6. Algunas rutas existen más como demostración que como producto cerrado

Archivo clave: [app/(dashboard)/especialidades/page.tsx](app/(dashboard)/especialidades/page.tsx)

La pantalla ya no es un stub vacío, pero sigue siendo una vista más demostrativa que operativa. Si la intención es producto real, hay que decidir si debe vivir como landing clínica de componentes o como módulo utilitario accesible desde navegación principal.

Qué haría:

- definir propósito exacto de la ruta,
- quitarla del flujo principal si no aporta valor real,
- o convertirla en módulo de especialidades con una utilidad clara.

## Otras mejoras que haría

- Extraer cálculos repetidos de dashboard, pacientes y consultas a funciones puras de dominio.
- Añadir tests de integración para auth, wizard, perfil profesional y recuperación de errores de sync.
- Revisar accesibilidad con teclado, foco visible, contraste y estados vacíos reales.
- Añadir telemetría mínima para fallos de sync, auth y API CIE.
- Revisar comportamiento offline real en móvil y en redes lentas.
- Reducir dependencia de respuestas genéricas en errores críticos y mostrar estados accionables al usuario.
- Separar mejor guardado local de sincronizado con nube en toda la UI.
- Aislar generación PDF si el tamaño de los documentos empieza a afectar la interacción.

## Mi conclusión

La app no está rota en el sentido básico; está funcional y bastante avanzada. Lo que veo es una base ya productiva que necesita endurecerse: menos lógica concentrada, más control de fallos, más trazabilidad y una definición más clara de qué pantallas son núcleo de producto y cuáles son soporte.

Si tuviera que priorizar solo tres cosas, haría esto primero:

1. endurecer sincronización,
2. separar y asegurar la API CIE,
3. dividir el wizard clínico y unificar el perfil profesional.