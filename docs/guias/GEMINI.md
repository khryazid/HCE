# Guía de Configuración y Uso de Gemini API (Google AI Studio) 🤖

*Actualizado para los cambios post Google I/O 2026 (Mayo 2026)*

Esta guía detalla cómo integrar la inteligencia artificial de Google (Gemini) en tu proyecto, teniendo en cuenta las últimas actualizaciones de la plataforma, modelos disponibles y mejores prácticas.

## 1. Google AI Studio y Claves API

Google AI Studio es tu panel de control para experimentar con modelos y gestionar tus llaves de acceso.

1. Ve a [Google AI Studio](https://aistudio.google.com/) e inicia sesión con tu cuenta de Google.
2. En el menú izquierdo, haz clic en **"Get API key"** (Obtener clave API).
3. Haz clic en el botón azul **"Create API key"**.
4. Selecciona un proyecto de Google Cloud existente o deja que AI Studio cree uno automáticamente por ti.
5. Copia la clave generada y pégala en tu archivo `.env.local` de la siguiente manera:
   ```env
   GEMINI_API_KEY=tu_clave_api_aqui
   ```
   > **Nota de Seguridad:** Al igual que con Stripe, NUNCA subas esta clave a GitHub ni la expongas en componentes del cliente (frontend).

## 2. Modelos Disponibles y Cambios Recientes (2026)

Google actualizó recientemente sus políticas y modelos (Mayo 2026). Es vital elegir el modelo correcto:

- **`gemini-3.5-flash` (Recomendado):** Es el modelo de inteligencia de frontera optimizado para velocidad, tareas de agentes y código. Sigue disponible en el **Tier Gratuito**.
- **Modelos Pro (Ej. `gemini-3.1-pro`):** Estos modelos *ya no están disponibles en la capa gratuita*. Si los usas sin tener facturación activada, recibirás errores.
- **Modelos obsoletos:** Las versiones antiguas como `gemini-2.0-flash` serán apagadas definitivamente el 1 de Junio de 2026, por lo que **siempre debes usar la rama 3.x**.

## 3. Instalación del SDK Oficial

Para conectarte desde Next.js (Node.js), usaremos el SDK oficial más reciente.
Abre tu terminal y ejecuta:

```bash
npm install @google/genai
```

*(Nota: Anteriormente se usaba `@google/generative-ai`, pero `@google/genai` es el nuevo estándar consolidado).*

## 4. Uso Básico en Next.js (Route Handlers / Server Actions)

Aquí tienes un ejemplo de cómo implementar un endpoint básico en Next.js (`app/api/chat/route.ts`) usando las mejores prácticas de 2026:

```typescript
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Inicializamos el cliente. Automáticamente detectará process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const response = await ai.models.generateContent({
      // SIEMPRE usa la versión más reciente del modelo Flash para el tier gratuito
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        // Mejores prácticas 2026: Ya no se recomienda modificar manualmente 
        // temperature, top_p o top_k en los modelos 3.x, deja los valores por defecto.
        
        // Si necesitas que responda estrictamente en JSON:
        responseMimeType: "application/json",
      }
    });

    return NextResponse.json({ text: response.text() });
  } catch (error) {
    console.error("Error en Gemini API:", error);
    return NextResponse.json({ error: "Fallo al procesar con IA" }, { status: 500 });
  }
}
```

## 5. Mejores Prácticas y Actualizaciones Críticas (Mayo 2026)

1. **Parámetros del Modelo:** Según la documentación más reciente, los modelos de la serie 3.x están altamente optimizados. **Evita** modificar manualmente la `temperature`, `top_k` o `top_p` a menos que tengas un caso de uso extremadamente específico. Los valores por defecto darán el mejor resultado.
2. **Nuevos Agentes Gestionados:** Si en el futuro necesitas flujos más complejos (como agentes autónomos que manejen estado y memoria), la nueva API ahora incluye "Managed Agents" nativos, lo que te evita tener que programar sistemas complejos de historial de chat a mano.
3. **Structured Outputs (JSON):** Si usas Gemini para extraer datos de textos médicos (ej. CIE-10), siempre pasa `responseMimeType: "application/json"` en la configuración y, opcionalmente, un `responseSchema` para forzar a que el modelo te devuelva la información exactamente en la estructura que tu base de datos necesita.
