# Integraciones — Glyphix HCE

## 1. Facturación (Stripe Billing) y Webhooks

**Supabase es el esclavo local, Stripe es la fuente de verdad.**
Cualquier cambio ocurre a través de los portales de Stripe (Checkout o Customer Portal) y se notifica vía Webhooks a `/api/stripe/webhook`.

### Webhooks y Eventos
- `checkout.session.completed`: Clínica adquirió un plan. Se activa la suscripción.
- `customer.subscription.updated`:
  - Si cancela (pero sigue activa hasta fin de mes), `status = "active"`.
  - Si pasa a `past_due`, entra al periodo de gracia (ver abajo).
  - Si desciende al plan Basic, elimina médicos extra en `clinic_members`.
- `invoice.payment_failed`: Stripe falló el cobro. Activa el periodo de gracia.

### Periodo de Gracia y Trials
- **7 días de gracia** para `past_due`. Permite operar mientras el banner alerta de suspensión inminente.
- Los trials expirados (`trialing`) se limpian a `inactive` mediante el cron diario `expire_stale_trials()`.
- **Idempotencia:** Todos los webhooks se auditan en la tabla `stripe_webhook_events` con `ON CONFLICT DO NOTHING`.

---

## 2. IA — Sugerencias CIE-10 (Gemini 2.0 Flash)

El modelo **`gemini-2.0-flash`** (configurado en `GEMINI_MODEL`) asiste al diagnóstico leyendo el `chief_complaint` (motivo) y `illness_history`.

### Endpoint Protegido (`/api/cie-suggestions/route.ts`)
- Verifica suscripciones activas/trial (y el periodo de gracia de 7 días).
- Retorna un JSON estructurado de hasta 5 códigos CIE-10.

### Rate Limiting por DB
La API utiliza una RPC en Postgres (`claim_api_rate_limit`) con bloqueos optimistas `FOR UPDATE` para restringir el consumo por `clinic_id`, evitando sobrecostos por requests concurrentes abusivos.

---

## 3. Email (Resend) y Web Push (VAPID)

- **Cron Jobs Diarios:** Supabase ejecuta a las 7 AM UTC (`send_followup_emails_daily`) y 8 AM UTC (`send_followup_push_daily`) notificando sobre seguimientos pendientes.
- **Idempotencia:** La tabla `notification_log` (`ON CONFLICT DO NOTHING`) evita envíos duplicados si el cron falla y reintenta.
- **Seguridad:** Los endpoints internos (`/api/email/followup` y `/api/push/send`) validan el acceso usando una comparación de tiempo constante (`timingSafeEqual`) contra los secretos guardados en `app_config`.
