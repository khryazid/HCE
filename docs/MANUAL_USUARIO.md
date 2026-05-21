# Manual de Usuario — Glyph HCE ⚕️

Bienvenido al manual oficial de **Glyph**, la plataforma de Historia Clínica Electrónica (HCE) multi-tenant de grado médico para especialistas y clínicas modernas.

Este documento describe detalladamente la visión del sistema, sus módulos principales, las capacidades de Inteligencia Artificial, el funcionamiento de la resiliencia *Offline-First* y el flujo de trabajo recomendado para maximizar la eficiencia y seguridad en tu consulta diaria.

---

## 🌟 1. Introducción y Filosofía de Diseño

Glyph ha sido desarrollado bajo tres pilares tecnológicos irrenunciables:
1. **0ms Latency (Local-First):** Toda la información de tus pacientes se almacena en el navegador mediante una base de datos IndexedDB. No hay pantallas de carga lentas ni retrasos al escribir notas clínicas.
2. **Resiliencia Extrema:** La aplicación funciona al 100% sin conexión a internet. Registra consultas, recetas y citas en hospitales rurales o consultorios subterráneos con la tranquilidad de que tu trabajo se guardará.
3. **Copiloto Clínico Inteligente:** La integración con la red neuronal **Gemini 2.0 Flash** automatiza los procesos repetitivos de codificación de diagnósticos e ingreso de medicamentos.

---

## 👥 2. Registro, Roles de Clínica y Onboarding

Glyph está estructurado con una arquitectura multi-tenant (multi-clínica) y multi-doctor corporativa.

### Flujo de Acceso Inicial
1. **Registro Gratuito:** Al crear una cuenta en Glyph, recibes un **Trial de 7 días sin tarjeta de crédito**.
2. **Creación del Tenant (Clínica):** Define el nombre de tu consultorio o clínica. Esto genera un espacio virtual aislado gobernado por políticas RLS.
3. **Invitaciones a Colegas:** Puedes invitar a otros profesionales mediante el panel de Ajustes (sujeto a los límites del plan contratado).

### Jerarquía de Seguridad (Roles)

| Rol | Permisos Clínicos | Permisos Administrativos | Ideal Para |
|---|---|---|---|
| **Administrador** | Lectura y Escritura completa | Configuración de clínica, Stripe Billing, gestión de usuarios, rotación de accesos | Directores de clínica, médicos fundadores |
| **Doctor** | Lectura y Escritura completa | Ninguno (solo lectura de su propio perfil) | Médicos especialistas asociados |
| **Visualizador (Viewer)** | Solo Lectura de expedientes y recetas | Ninguno | Asistentes médicos, secretarios y recepcionistas |

---

## 🔍 3. Búsqueda Global Categorizada (Ctrl+K)

Para ahorrar tiempo buscando expedientes, Glyph incorpora una potente barra de comandos rápida.

* **Activación:** Presiona `Ctrl + K` desde cualquier ventana del sistema.
* **Debounce Inteligente:** El buscador espera `280ms` tras la última tecla pulsada antes de disparar la consulta al servidor, reduciendo el consumo de recursos de red.
* **Búsqueda Full-Text (FTS):** Aprovecha la potencia del motor PostgreSQL con índices GIN en español. Busca pacientes por nombre, identificación, o consultas por texto libre (ej: *"hipertensión"*, *"asma"*), localizando coincidencias morfológicas afines.
* **Navegación 100% Teclado:** Utiliza las flechas `↑` y `↓` para moverte entre los resultados de pacientes o citas y presiona `Enter` para cargar el expediente seleccionado al instante.

---

## 📋 4. Asistente Guiado de Consulta (Wizard de 6 Pasos)

El motor clínico de Glyph organiza las consultas médicas a través de un flujo estructurado de 6 etapas que agilizan el diagnóstico.

### Los 6 Pasos del Flujo
1. **Contexto del Paciente:** Carga los datos demográficos y antecedentes médicos relevantes del paciente seleccionado.
2. **Signos Vitales:** Captura frecuencia cardíaca, temperatura, peso, talla e ingresa la presión arterial sistólica y diastólica. **El sistema calcula de manera automática la Presión Arterial Media (PAM)** y autocompleta el estado de normalidad.
3. **Anamnesis y Síntomas:** Documenta el motivo de consulta e historia médica en campos de texto enriquecidos con memoria local.
4. **Juicio Diagnóstico (CIE-10):** Asigna los diagnósticos definitivos o presuntivos apoyado por el asistente de IA en vivo.
5. **Recetario y Fármacos:** Estructura las indicaciones del tratamiento mediante el constructor de posología.
6. **Vista Previa y Cierre:** Valida el borrador completo en un PDF membretado antes de aplicar el sellado criptográfico inmutable.

### UI Adaptativa: Clinical Rompecabezas
Cada especialista médico enfoca la consulta de forma distinta. Con el **Clinical Rompecabezas**, puedes colapsar y arrastrar secciones completas del wizard según tu especialidad. Esta disposición personalizada se guarda en formato `JSONB` ligado a tu usuario, presentándose siempre de la misma forma en cualquier dispositivo donde inicies sesión.

---

## 🤖 5. Copiloto de Inteligencia Artificial (Gemini)

El asistente de IA trabaja silenciosamente en dos puntos estratégicos del wizard de consulta:

### Sugerencias CIE-10 en Vivo
Mientras describes la sintomatología del paciente en el Paso 3, la IA analiza semánticamente el texto y, al llegar al Paso 4, te muestra una lista dinámica de **diagnósticos probables** bajo el estándar **CIE-10 (Clasificación Internacional de Enfermedades)**. Un solo clic en el tag sugerido lo añade al expediente.

### Constructor de Posología
Escribir recetas estructuradas consume mucho tiempo. Con el constructor inteligente, puedes teclear o dictar la receta en texto libre:
> *"Dar Paracetamol 500mg cada 8 horas por un periodo de 5 días"*

La IA parseará el texto y lo convertirá en campos estructurados independientes en la base de datos (Principio Activo, Dosis, Frecuencia, Duración), asegurando un PDF perfectamente legible sin esfuerzo adicional.

---

## 📶 6. Resiliencia Offline-First y Sincronización

La característica más robusta de Glyph es su capacidad para operar desconectado de la red.

```
+--------------------+      Sin Red (Offline)      +-------------------------+
|    Interfaz PWA    | --------------------------> |  IndexedDB Navegador    |
| (Operación en 0ms) |                             | (Cola de Sincronización)|
+--------------------+                             +-------------------------+
                                                                |
                                                                v (Red Restablecida)
+--------------------+                               +-------------------------+
| Supabase Postgres  | <---------------------------- |      Sync Worker        |
|  (Nube Segura)     |     Despacho en Background    | (Backoff Exponencial)   |
+--------------------+                               +-------------------------+
```

### El Proceso de Sincronía
* Al perder la señal de internet, Glyph entra en **Modo Local**. Puedes seguir operando sin bloqueos.
* Los datos se encolan cronológicamente en el storage local **IndexedDB**.
* Al recuperar internet, un **Sync Worker** despacha la cola automáticamente.
* Para proteger los servidores y la red del usuario ante micro-cortes, el worker implementa un **Backoff Exponencial** (re-intentos espaciados: 1s, 2s, 4s, 8s, etc.).

### Estados de la Barra de Sincronización

* **🔴 Suscripción Expirada:** Tu plan de Stripe ha vencido. La sincronización se congela temporalmente hasta que se registre el pago en el portal.
* **🟡 Dispositivo Offline:** Tu red local está caída. Los cambios se guardan localmente de forma segura.
* **🟠 Realtime Inactivo:** Tienes internet, pero el canal WebSockets de Supabase se ha cerrado. El sistema realiza polling de respaldo y reconexión automática.
* **🟢 Sincronizado:** Todo tu historial clínico está a salvo en los servidores en la nube de Supabase y respaldado localmente.

---

## 📁 7. Exportación Completa y Seguridad Jurídica

La privacidad y portabilidad de los datos de salud son prioritarias.

### Inmutabilidad Criptográfica (Chain of Custody)
Cada consulta sellada en Glyph genera una firma **hash criptográfica SHA-256 encadenada**. El hash del registro actual incorpora el contenido de la consulta y el hash de la consulta anterior. Esto asegura que nadie pueda modificar los registros pasados directamente en la base de datos sin romper la cadena, ofreciendo blindaje jurídico absoluto ante auditorías legales.

### Exportación ZIP Client-Side
Permite exportar el expediente médico completo de un paciente con un solo clic. El proceso se realiza 100% en el navegador (preservando la privacidad sin pasar por APIs terceras):
* Crea un archivo `00_paciente.json` con los datos demográficos.
* Compila un `index.json` cronológico con las consultas médicas asociadas.
* Renderiza e incluye de forma automática **un PDF por cada consulta** del historial con membrete y firmas oficiales.
* Entrega un archivo `.zip` comprimido y listo para almacenar o entregar al paciente.

---

## 💳 8. Facturación Stripe y Ajustes Administrativos

### Portal de Autoservicio Stripe
Desde el panel de Ajustes, el administrador tiene acceso inmediato al **Customer Portal de Stripe**. Desde allí, de forma segura e independiente, puede:
* Actualizar o cambiar el método de pago principal (tarjeta de crédito/débito).
* Aumentar o disminuir el número de "asientos" (doctores activos) de la clínica.
* Consultar y descargar facturas en PDF de cobros pasados.
* Cancelar o pausar la suscripción.

### Notificaciones Push e Email
* **Notificaciones Push (Web Push API):** Recibe recordatorios en tu dispositivo a las 8:00 AM con las consultas agendadas.
* **Recordatorios de Citas por Email (Resend):** Un servicio cron autónomo configurado en el servidor envía automáticamente correos branded de recordatorio a tus pacientes a las 7:00 AM, disminuyendo la inasistencia.

---

## 📅 9. Flujo Diario de Operación Recomendado

Para exprimir todo el potencial de Glyph, te sugerimos seguir esta rutina en tu clínica:

1. **Planificación Matutina:** Al abrir tu panel, revisa la Agenda de citas del día. El sistema ya habrá enviado los recordatorios por correo a tus pacientes de forma automática.
2. **Apertura de Consulta:** Utiliza `Ctrl + K` para localizar rápidamente al paciente que entra a tu consultorio.
3. **Toma de Vitales:** Registra los signos del paciente. El sistema calculará e indicará inmediatamente la normalidad de la PAM.
4. **Anamnesis Asistida:** Redacta el motivo de consulta. Selecciona los diagnósticos CIE-10 sugeridos por la IA con un clic.
5. **Recetario Veloz:** Carga tus recetas comunes desde el repositorio de **Plantillas**, ajústalas si es necesario con el posólogo de IA, y finaliza sellando la consulta.
6. **Descarga:** Imprime el PDF membretado al instante para tu paciente.
7. **Movilidad:** Si debes realizar visitas domiciliarias o rondas hospitalarias sin WiFi, abre la app en tu tablet o teléfono PWA. Registra los expedientes con normalidad y deja que la sincronización silenciosa respalde los datos al volver a conectar a la red.
