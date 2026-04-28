# Auditoría del Proyecto: HCE Multiespecialidad

## 1. Resumen Ejecutivo y Estado de Salud
La plataforma "HCE Multiespecialidad" presenta una base arquitectónica moderna e inteligente. El enfoque offline-first con una cola de sincronización (IndexedDB + WebCrypto) y aislamiento multi-tenant a través de RLS en Supabase demuestran que el proyecto ha sido pensado para producción desde el día uno. El stack tecnológico (Next.js 16, React 19) es de vanguardia. 

Sin embargo, estamos en un punto crítico de **estabilización**. La aplicación sufre de problemas de gestión de memoria (Out-Of-Memory) tanto en la sincronización en segundo plano como en la generación de documentos (PDF). Asimismo, existen fricciones con el nuevo motor de React 19 que han llevado a introducir "parches" o anti-patrones en el manejo del estado para evitar colisiones en el ciclo de renderizado.

## 2. Código Muerto y Obsolescencia
Tras revisar la estructura y el `package.json`:
- **`app/api/cie-suggestions/route.ts` (Línea 79):** Existe una asignación `void candidateEntries;` declarada para "contexto futuro" que es esencialmente código inútil. Debe ser limpiado para no confundir al analizador sintáctico ni al desarrollador.
- **Manejo de promesas flotantes:** En `sync-worker.ts` y en el manejador del evento online, hay promesas que se llaman con `void flushSyncQueue();`. Aunque válido en TypeScript, si la cola de sincronización falla, el error silencioso no se propaga al UI de forma robusta más allá del logger.
- **Dependencias:** Tienes `jspdf` (v4.2.1). Esta librería es notoriamente pesada y mala manejando imágenes pesadas (base64) del lado del cliente, lo cual es la raíz de uno de tus bugs. 

## 3. Vulnerabilidades y Errores Críticos (Alta Prioridad)
- **Crashes por Memoria en Generación de PDFs (`lib/consultations/pdf.ts`):**
  Actualmente insertas `logo_data_url` y `signature_data_url` directamente usando `doc.addImage`. Si un médico sube una foto de su firma de 8MB directo del móvil (lo cual pasará), el data URI gigante causará un desbordamiento de pila y la aplicación se cerrará en dispositivos de gama media/baja.
  **Solución Propuesta:** Implementar una función que utilice la API nativa de `Canvas` para redimensionar y bajar la calidad de la imagen a JPEG/WebP estricto (ej. máximo 600px de ancho) *antes* de enviarlo a jsPDF, o idealmente comprimirla desde el momento en que el usuario la sube en "Ajustes".

- **Cuello de Botella de Memoria y Rendimiento en IndexedDB (`lib/sync/sync-worker.ts`):**
  En el bloque `NF-04` (Línea 333), cuando resuelves la fusión de un paciente (`PATIENT_MERGE_REQUIRED`), haces:
  ```typescript
  const allRecords = await db.getAll("clinical_records");
  const affectedRecords = allRecords.filter((r) => r.patient_id === item.record_id);
  ```
  `getAll` carga **toda** la tabla de historias clínicas a la memoria RAM de golpe. En una clínica con miles de registros, esto matará el hilo principal del navegador móvil.
  **Solución Propuesta:** Usar índices de IndexedDB: `await db.getAllFromIndex("clinical_records", "by_patient", item.record_id);` o utilizar cursores (`cursor = await db.transaction.store.openCursor()`) para actualizar registros uno por uno sin desbordar la memoria.

## 4. Deuda Técnica y Oportunidades de Mejora (Media Prioridad)
- **Anti-patrones de Estado en React 19 (`lib/consultations/use-wizard-cie-suggestions.ts`):**
  Has introducido múltiples llamadas `Promise.resolve().then(() => setCieSuggestions(...))` (ej. líneas 75, 91, 101). Esto es un "hack" para evitar las advertencias de React sobre actualizaciones de estado cruzadas durante la fase de renderizado. 
  **Solución:** React 19 favorece el uso de `useTransition` o derivación de estados puros. Esta lógica debería reescribirse para no disparar efectos que corrigen el estado de un render anterior.
- **Tipados de Escape Inseguros en Supabase:**
  En `sync-worker.ts` (Línea 162), estás forzando a TypeScript a ignorar la realidad:
  `const tableClient = supabase.from(tableName as never) as unknown as TableSyncClient;`
  Esto rompe todo el propósito de tener Supabase tipado. Deberías utilizar un Type Guard estricto o un `switch` exhaustivo que devuelva la instancia correctamente tipada usando tus interfaces generadas (`Database['public']['Tables']`).

## 5. Recomendaciones para el Tasklist
Recomiendo añadir e iterar de inmediato sobre estas tareas al Backlog:

- [ ] **[CRÍTICO] Módulo `Settings / Perfil`:** Implementar compresión de imágenes obligatoria (Canvas API) en el lado del cliente para logotipos y firmas ANTES de guardarlos en IndexedDB/Supabase.
- [ ] **[ALTO] Refactor del Hook `useWizardCieSuggestions`:** Migrar los "hacks" de microtareas (`Promise.resolve`) al uso de concurrencia nativa (`startTransition`) o `useActionState` según los nuevos patrones de React 19.
- [ ] **[MEDIO] Tipado Seguro de Sync:** Reemplazar el `as never as unknown` del worker de sincronización creando una utilidad genérica validada por inferencia de tipos de la DB de Supabase.
- [ ] **[SEGURIDAD] API de Sugerencias:** Configurar un circuit-breaker o validador de configuración estricto en la API `route.ts`. Si `GEMINI_API_KEY` falla constantemente, pausar reintentos a la API de Google temporalmente (usando caché o Redis) para prevenir rate-limiting por parte del proveedor.
