<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:doc-hygiene-rules -->
# Reglas de documentación del proyecto

**Un solo lugar para cada tipo de documento:**

| Tipo | Archivo único |
|------|--------------|
| Tareas pendientes, sprint, bugs | `docs/BACKLOG.md` |
| Estado del proyecto, setup | `README.md` |
| Sistema de diseño | `docs/DESIGN_SYSTEM.md` |
| Guía de migraciones SQL | `docs/SUPABASE_MIGRATIONS.md` |
| Decisiones de arquitectura | `docs/001-ADR-*.md` |

**Está PROHIBIDO crear:**
- Archivos `task.md`, `analysis_*.md`, `informe_*.md`, `SKILL.md` en la raíz del proyecto
- Carpetas `docs/archive/` con auditorías viejas
- Archivos `.ts` o `.tsx` huérfanos que no son importados por nadie
- Duplicados de metadata, configuración o tipos

**Al completar una tarea:**
1. Marcar el ítem como `[x]` en `docs/BACKLOG.md`
2. Actualizar la fecha "Última revisión" en el header del BACKLOG
3. NO crear nuevos archivos de reporte — actualizar los existentes

**Al detectar un archivo obsoleto:** Eliminarlo y hacer commit inmediato.
<!-- END:doc-hygiene-rules -->
