# 📡 Referencia de API e Integraciones

## Webhooks de Stripe (Facturación SaaS)
La integración con Stripe permite gestionar suscripciones automatizadas para clínicas.

### Endpoint: `/api/stripe/webhook`
- **Propósito**: Escucha eventos críticos de Stripe (`checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`).
- **Seguridad**: Valida la firma del payload con `STRIPE_WEBHOOK_SECRET`.
- **Prevención de Replay Attacks**: Utiliza una inserción atómica en base de datos al inicio del handler. Gracias al "Unique Constraint" (`23505`) en el ID del evento, los reintentos concurrentes de Stripe se abortan instantáneamente, cerrando la ventana de Race Conditions.

## Integración con Inteligencia Artificial (CIE-11)
El asistente de codificación diagnóstica facilita la adopción de la CIE-11 mediante procesamiento de lenguaje natural.

### Flujo de Codificación IA
1. **Entrada Clínica**: El médico escribe sus notas de evolución o diagnóstico tentativo en texto libre.
2. **Procesamiento**: El backend sanitiza la petición (verificando Rate Limits y autenticación del usuario mediante sesión de Supabase).
3. **Inferencia LLM**: Se envía la nota al motor LLM junto al contexto sistémico.
4. **Mapeo CIE-11**: La IA devuelve un JSON estructurado con los códigos CIE-11 más probables, su descripción estandarizada, y un nivel de confianza (`confidence_score`).

## Rate Limiting & Auth (WhatsApp/Recordatorios)
Endpoints expuestos para la emisión de recordatorios o envío de PDF (como recetas) por WhatsApp.
- **Vulnerabilidad Histórica Corregida**: Anteriormente, el control de Rate Limit confiaba en el header `x-user-id` enviado por el cliente. 
- **Estado Actual**: Se ignora cualquier header de identificación del cliente. La validación se realiza siempre on-server utilizando `@/lib/supabase/server` (`createClient().auth.getUser()`). El middleware valida que la ruta empiece por `/api/` y permite el flujo sin redirecciones, pero el endpoint rechaza peticiones no autenticadas con `401 Unauthorized`.
