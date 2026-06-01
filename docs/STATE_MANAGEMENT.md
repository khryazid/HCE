# 🧠 Gestión de Estado en el Cliente

## TanStack Query & Estrategia de Caching
El frontend de Glyphix utiliza **TanStack Query (React Query)** como el estándar principal para el estado asíncrono y caché del servidor.

### Interacción con IndexedDB (Offline-First)
En lugar de que TanStack Query realice llamadas HTTP (`fetch()`) directamente a Supabase, interactúa con un adaptador local.
1. **Lectura (Queries)**: React Query invoca al Service/Repository local, el cual lee de IndexedDB.
2. **Escritura (Mutations)**: Las mutaciones guardan en IndexedDB y agregan una entrada en `sync_queue`.
3. **Invalidación de Caché**: Tras un guardado exitoso en IDB, React Query invalida las claves correspondientes (ej. `['patients', clinic_id]`), lo que fuerza una lectura de la nueva versión local en tiempo real, reflejando el cambio al usuario al instante.

### Invalidación por Sincronización Remota
Cuando el **Sync Worker** recibe datos frescos del servidor (cambios realizados por otro usuario), inyecta los datos en IndexedDB y emite un evento de aplicación (`BroadcastChannel` o equivalente). Un listener global de TanStack Query atrapa este evento y fuerza un `queryClient.invalidateQueries()`, actualizando la UI mágicamente sin intervención del usuario.

## Estado Síncrono (Zustand)
Para el estado efímero o persistente local que no forma parte de la base de datos (por ejemplo, el tema UI, paneles laterales abiertos, o selecciones de filtros complejos), se emplea **Zustand**.
- Su uso es minimalista y evita solapamientos con TanStack Query. Si los datos pertenecen al servidor/historial clínico, van por TanStack Query + IDB. Si pertenecen a la sesión interactiva del navegador, van por Zustand.

## Reducción de Renders Innecesarios
La arquitectura fomenta:
- **Estados Derivados**: Uso exhaustivo de variables derivadas y uso cauteloso de `useState`.
- **Componentes Controlados Optimizados**: En formularios complejos (como el Wizard Clínico), se condiciona el renderizado (ej: toggles para ocultar inputs complementarios) reduciendo el árbol de DOM y la sobrecarga cognitiva, impactando positivamente en el rendimiento en dispositivos móviles.
