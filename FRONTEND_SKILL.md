# Frontend Skill Guide (HCE)

Guia operativa para mantener consistencia visual, UX y calidad tecnica en interfaces del proyecto.

## Objetivo

Aplicar un criterio unico de frontend en todo cambio UI:

- experiencia clara para personal medico,
- accesibilidad real,
- componentes reutilizables,
- cambios pequenos y verificables.

## Stack y convenciones

- Framework: Next.js App Router.
- UI: React + Tailwind CSS.
- Tipado: TypeScript estricto.
- Validacion minima de cambios: `npm run lint` y `npm run typecheck`.

## Flujo de trabajo recomendado

1. Identificar el flujo de usuario exacto antes de tocar UI.
2. Hacer cambios pequenos sobre componentes existentes.
3. Evitar mover logica de negocio al componente visual si no es necesario.
4. Probar estados vacio, cargando, error y exito.
5. Ejecutar lint y typecheck.

## Reglas de UX para este producto

- Priorizar lenguaje simple: evitar terminos tecnicos para usuario final.
- Reducir friccion en formularios: placeholders claros y errores junto al campo.
- Mantener continuidad de flujo: tras una accion exitosa, guiar al siguiente paso.
- No bloquear por informacion avanzada que pueda autogenerarse.
- Preferir feedback inmediato sobre mensajes genericos.

## Reglas visuales

- Reusar patrones existentes de bordes, radios y espaciado.
- Mantener consistencia de estilos en botones principales y secundarios.
- Evitar cambios de estilo globales en tareas locales.
- En listados seleccionables, preferir chips o botones claros en lugar de controles densos.

## Accesibilidad minima obligatoria

- Todos los inputs con etiqueta visible o asociada.
- Estados de foco visibles en elementos interactivos.
- No usar solo color para comunicar estado.
- Botones con texto accionable y especifico.
- Revisar contraste suficiente en texto y acciones primarias.

## Patrones de componentes

- Presentacion y logica separadas cuando el archivo crece demasiado.
- Props tipadas y nombres explicitos.
- Evitar duplicar UI: extraer a `components/ui` cuando aparezca el tercer uso.
- Evitar side effects en render; usar handlers y efectos controlados.

## Checklist rapido antes de cerrar un cambio

- El flujo principal se entiende sin explicacion externa.
- Mensajes de error son accionables.
- Existe estado de exito visible.
- Teclado puede navegar los controles principales.
- Lint y typecheck estan en verde.

## Extensiones VS Code recomendadas (opcional)

- `bradlc.vscode-tailwindcss`
- `deque-systems.vscode-axe-linter`
- `pulkitgangwar.nextjs-snippets`
- `animaapp.vscode-anima` (solo si se usa Figma en el flujo)

## Aplicacion en este repo

Usar esta guia para cambios en:

- `app/` para paginas y rutas.
- `components/ui/` para patrones de interfaz reutilizables.
- `components/clinical/` para visualizaciones clinicas con foco en legibilidad.

En PRs o entregas internas, incluir una nota corta de que reglas de esta guia se validaron.

## Plantilla de PR

Para estandarizar revisiones de cambios visuales, usar la plantilla:

- `.github/PULL_REQUEST_TEMPLATE.md`

Cuando el cambio toque login/registro, completar tambien el bloque `Checklist Auth (login/registro)` dentro de esa plantilla.
