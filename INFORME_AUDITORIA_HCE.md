# Informe técnico de auditoría - HCE Multiespecialidad

Fecha: 27 de abril de 2026

## Alcance

Auditoría enfocada en:

- Fallas técnicas y bugs críticos en modo offline y en el registro de médicos.
- Seguridad y privacidad, con foco en RLS multi-tenant y cifrado PHI en IndexedDB.
- Deuda técnica y arquitectura del wizard de consultas y la cola de sincronización.
- Rendimiento y riesgos en la composición de Client Components y Server Components.
- UI/UX y accesibilidad en auth, PDF y componentes UI compartidos.

## Hallazgos por severidad

### Crítica

#### 1) `TypeError: Failed to fetch` en modo offline por fetch directo sin fallback local

**Problema**

La ruta de sugerencias CIE dispara una petición HTTP directa a `/api/cie-suggestions` sin una guardia real de conectividad. En modo offline, el navegador lanza `TypeError: Failed to fetch` antes de que la capa superior pueda resolver el estado de la experiencia.

**Ubicación**

- [lib/consultations/cie-suggestions-client.ts](lib/consultations/cie-suggestions-client.ts#L33)
- [lib/consultations/use-wizard-cie-suggestions.ts](lib/consultations/use-wizard-cie-suggestions.ts#L1)

**Solución sugerida**

- Envolver la llamada en `try/catch`.
- Verificar `navigator.onLine` o una heurística equivalente antes de intentar el fetch.
- Si no hay red, devolver coincidencias del catálogo local en lugar de depender de la API.
- Mantener la API como mejora asistida, no como dependencia obligatoria del flujo offline.

#### 2) Riesgo alto en la custodia de la clave PHI cifrada en IndexedDB

**Problema**

El cifrado usa AES-GCM, que es correcto, pero la clave maestra se genera y se guarda persistida en un store local del navegador. Además, el backup exporta la misma clave en claro. Eso protege contra observación casual, pero no contra acceso al perfil del navegador, extensiones maliciosas o exfiltración local.

**Ubicación**

- [lib/db/crypto.ts](lib/db/crypto.ts#L3)
- [lib/db/crypto.ts](lib/db/crypto.ts#L76)
- [lib/db/crypto.ts](lib/db/crypto.ts#L107)
- [lib/db/crypto.ts](lib/db/crypto.ts#L111)

**Solución sugerida**

- Separar clave de contenido y clave de envoltura si se mantiene un backup exportable.
- Derivar una clave local a partir de un PIN o secreto de sesión para desbloqueo offline.
- Cifrar el backup exportado o, como mínimo, tratarlo como material sensible de alto riesgo.
- Documentar explícitamente el modelo de amenaza de PHI local.

#### 3) RLS multi-tenant no homogénea en Supabase

**Problema**

Las políticas de RLS no usan una validación uniforme por tenant en todas las tablas sensibles. `patients` depende de `exists` sobre `profiles`, mientras `clinical_records` y `specialty_data` validan solo `doctor_id = auth.uid()`. Eso deja parte de la separación de clínica apoyada en supuestos de aplicación y no en una barrera de seguridad consistente.

**Ubicación**

- [lib/supabase/000_production_full_schema.sql](lib/supabase/000_production_full_schema.sql#L136)
- [lib/supabase/000_production_full_schema.sql](lib/supabase/000_production_full_schema.sql#L172)
- [lib/supabase/000_production_full_schema.sql](lib/supabase/000_production_full_schema.sql#L187)

**Solución sugerida**

- Unificar las políticas usando `clinic_id` y `doctor_id` como criterio base.
- Si el modelo lo permite, usar una función de contexto de tenant o claims del JWT para simplificar la validación.
- Añadir pruebas de acceso cruzado entre clínicas y usuarios para evitar regresiones.

### Alta

#### 4) El registro de médicos pierde la especialidad canónica al persistir solo el primer valor

**Problema**

El formulario de registro permite múltiples especialidades, pero al enviar la cuenta solo persiste `specialties[0]` como `specialty`. Luego el perfil profesional reconstruye el membrete desde el tenant, de modo que el dato guardado y el dato mostrado pueden divergir. Esto explica el mapeo incorrecto o inconsistente de especialidad.

**Ubicación**

- [components/ui/auth-form.tsx](components/ui/auth-form.tsx#L154)
- [components/ui/professional-profile-form.tsx](components/ui/professional-profile-form.tsx#L220)
- [lib/supabase/onboarding.ts](lib/supabase/onboarding.ts#L4)
- [lib/supabase/profile.ts](lib/supabase/profile.ts#L1)

**Solución sugerida**

- Definir una fuente canónica para la especialidad primaria.
- Persistir el arreglo completo `specialties` de forma consistente de punta a punta, o reducir el modelo a una sola especialidad primaria explícita.
- Evitar reconstrucciones implícitas basadas en campos derivados.

#### 5) Estado `abandoned` de la cola de sincronización sin recuperación operativa

**Problema**

La cola marca ítems como `abandoned` cuando agota reintentos, pero el flujo de flush no los reintenta y la interfaz solo los enumera o permite descartarlos. El resultado es una pérdida operativa de datos o una muerte silenciosa de ítems que podrían ser recuperables.

**Ubicación**

- [lib/sync/sync-worker.ts](lib/sync/sync-worker.ts#L230)
- [lib/sync/sync-worker.ts](lib/sync/sync-worker.ts#L346)
- [components/ui/sync-queue-panel.tsx](components/ui/sync-queue-panel.tsx#L51)

**Solución sugerida**

- Añadir una acción de reintento manual para `abandoned`.
- Mostrar el motivo del abandono y el historial de reintentos.
- Permitir re-clasificar manualmente el ítem a `pending` tras revisión.

### Media

#### 6) El wizard de consultas sigue siendo demasiado orquestador para una sola unidad lógica

**Problema**

Aunque ya hay subhooks, el hook principal todavía coordina persistencia, bootstrap de datos, deep links, sugerencias CIE, validación, PDF y flujo de guardado. Eso aumenta el acoplamiento, dificulta pruebas unitarias y amplifica cualquier cambio.

**Ubicación**

- [lib/consultations/use-consultation-wizard.ts](lib/consultations/use-consultation-wizard.ts#L188)
- [lib/consultations/use-consultation-wizard.ts](lib/consultations/use-consultation-wizard.ts#L212)
- [lib/consultations/use-consultation-wizard.ts](lib/consultations/use-consultation-wizard.ts#L270)
- [lib/consultations/use-consultation-wizard.ts](lib/consultations/use-consultation-wizard.ts#L280)

**Solución sugerida**

- Separar el flujo en hooks más pequeños: estado, datos, persistencia y side effects.
- Mantener el hook principal como fachada, no como contenedor de reglas.
- Crear pruebas específicas por responsabilidad.

#### 7) La ruta de rate limiting CIE depende de RPC en el camino crítico

**Problema**

El rate limit se valida mediante un RPC a Supabase para cada interacción asistida. Es correcto como control de estado compartido, pero añade latencia y dependencia al backend para una experiencia que idealmente debería degradar de forma suave.

**Ubicación**

- [lib/ai/cie-rate-limit.ts](lib/ai/cie-rate-limit.ts#L40)
- [lib/supabase/000_production_full_schema.sql](lib/supabase/000_production_full_schema.sql#L383)

**Solución sugerida**

- Mantener el RPC como fuente de verdad.
- Añadir cache de muy corta duración o telemetría para visibilidad de latencia.
- Tratar la sugerencia local como fallback funcional.

#### 8) Contraste y superposición de PDF dependen de estilos dispersos y z-index ad hoc

**Problema**

La UI de auth y previsualización PDF usa tokens de color y capas superpuestas que funcionan, pero están cerca del límite en legibilidad y escalabilidad visual. El modal PDF usa un z-index fijo alto y el texto secundario puede quedar demasiado suave en ciertas pantallas.

**Ubicación**

- [app/globals.css](app/globals.css#L8)
- [components/clinical/wizard-pdf-preview-modal.tsx](components/clinical/wizard-pdf-preview-modal.tsx#L31)

**Solución sugerida**

- Centralizar primitives visuales en `components/ui` con variantes semánticas.
- Definir una escala de overlays y modales en un único sistema de diseño.
- Endurecer los tokens de contraste para texto secundario y superficies suaves.

### Baja

#### 9) La persistencia local y el panel de sincronización deberían desacoplarse si el sistema crece más

**Problema**

No aparece una fuga de memoria crítica inmediata, pero el panel de sync mezcla listeners, polling, persistencia local y renderizado de estado en una sola pieza bastante cargada.

**Ubicación**

- [components/ui/sync-queue-panel.tsx](components/ui/sync-queue-panel.tsx#L1)

**Solución sugerida**

- Mover el polling y la persistencia del último sync a un hook dedicado.
- Dejar el panel solo como vista y acciones de usuario.

## Observaciones adicionales

- La base offline-first es real y no parece un prototipo superficial.
- El cifrado local existe, pero su modelo de custodia de clave necesita definición explícita para una app médica.
- El layout y los tokens visuales ya tienen intención, pero conviene unificar variantes para evitar estilos aislados.

## Plan de remediación en 3 fases

### Fase 1: Contención de riesgo clínico

- Corregir el fallback offline de CIE.
- Cerrar la brecha RLS con reglas uniformes por tenant.
- Arreglar el mapeo de especialidades en el alta y el perfil profesional.

### Fase 2: Robustez operativa

- Dar recuperación real a `abandoned` en la cola de sync.
- Fortalecer la custodia de la clave PHI local.
- Añadir pruebas de regresión para offline, sincronización y acceso cruzado.

### Fase 3: Endurecimiento para producción

- Unificar el sistema visual con componentes UI compartidos.
- Simplificar el wizard de consultas en módulos con responsabilidades claras.
- Añadir métricas de latencia y error para CIE, PDF y sync.

## Conclusión

La aplicación tiene una base sólida para un producto offline-first multi-tenant, pero aún no está lista para producción médica sin cerrar tres frentes: seguridad de tenant, custodia de PHI y recuperación operativa de la sincronización. El resto de los problemas son de mantenibilidad y UX, pero conviene resolverlos antes de escalar funcionalidades.