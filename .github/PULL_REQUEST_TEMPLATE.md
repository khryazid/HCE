## Resumen

Describe en 2-4 lineas que cambia este PR y por que.

## Tipo de cambio

- [ ] UI/UX
- [ ] Bugfix
- [ ] Refactor
- [ ] Performance
- [ ] Accesibilidad
- [ ] Documentacion

## Evidencia visual (si aplica)

Adjunta capturas o GIF de:

- estado anterior,
- estado nuevo,
- vista movil y desktop.

## Checklist Frontend HCE

- [ ] El flujo principal se entiende sin explicacion externa.
- [ ] Los mensajes de error son accionables y estan cerca del campo.
- [ ] Existe estado de exito visible despues de acciones clave.
- [ ] Se mantuvo consistencia visual con componentes existentes.
- [ ] La navegacion por teclado funciona en controles principales.
- [ ] No se usa solo color para indicar estado.
- [ ] Se validaron estados vacio, cargando, error y exito.
- [ ] No se expone terminologia tecnica innecesaria al usuario final.

## Checklist Auth (login/registro) - si aplica

- [ ] Registro exitoso guia al siguiente paso correcto (iniciar sesion o dashboard segun sesion).
- [ ] Redirecciones post-login y post-registro estan definidas y no dejan al usuario bloqueado.
- [ ] Mensajes de confirmacion por correo indican revisar entrada y spam.
- [ ] El flujo contempla sesion expirada o credenciales invalidas con mensaje claro.
- [ ] El correo se conserva o precarga cuando mejora continuidad del flujo.
- [ ] No se exponen campos tecnicos al usuario final (ej. UUIDs internos).
- [ ] Se verifico navegacion de teclado en campos y acciones principales.

## Checklist Tecnico

- [ ] No se agrego logica de negocio innecesaria en componentes visuales.
- [ ] Se reutilizaron componentes antes de duplicar UI.
- [ ] `npm run lint` en verde.
- [ ] `npm run typecheck` en verde.

## Riesgos y mitigacion

Indica brevemente:

- riesgo principal,
- impacto esperado,
- como se puede revertir si algo falla.

## Referencias

- Skill frontend: [FRONTEND_SKILL.md](../FRONTEND_SKILL.md)
- Tasklist UI (si aplica): [TASKLIST_UI.md](../TASKLIST_UI.md)
