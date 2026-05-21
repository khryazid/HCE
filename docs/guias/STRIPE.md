# Guía de Configuración Local de Stripe 💳

Esta guía detalla cómo configurar Stripe en el entorno de desarrollo local, incluyendo la simulación de pagos y la recepción de webhooks mediante Stripe CLI.

## 1. Crear tu cuenta y activar el "Modo de Prueba"

1. Ve a [dashboard.stripe.com/register](https://dashboard.stripe.com/register) y crea una cuenta gratuita.
2. Ingresa al panel de control (Dashboard).
3. **¡SÚPER IMPORTANTE!** En la esquina superior derecha, asegúrate de que el interruptor **"Test mode" (Modo de prueba)** esté **ACTIVADO**. Todo lo que hagamos a partir de ahora será con dinero falso.

## 2. Obtener las Claves API

Stripe te da dos llaves maestras para conectar tu código:
1. En el menú izquierdo de Stripe, haz clic en **"Developers"** (Desarrolladores) y luego en **"API keys"** (Claves API).
2. Verás dos claves. Ábrelas y cópialas en tu archivo `.env.local`:

   - **Publishable key** (Empieza con `pk_test_...`): Pégala en `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   - **Secret key** (Empieza con `sk_test_...`): Pégala en `STRIPE_SECRET_KEY`.

> **Nota de Seguridad:** La **Secret key** es privada. Nunca la subas a GitHub ni la expongas en el frontend.

## 3. Crear tu Plan de Suscripción (El Producto)

Para cobrar, necesitas tener un producto creado en Stripe:
1. En el menú, ve a **"Product Catalog"** -> **"Products"**.
2. Haz clic en **"Add product"**.
3. Llena los datos (Ej. Nombre: "Suscripción Mensual", Precio: $29.00, Facturación: Mensual).
4. Guarda el producto.
5. En la sección **"Pricing"** del producto creado, copia el **"API ID"** (empieza con `price_...`).
6. Pega ese ID en tu `.env.local` en la variable `NEXT_PUBLIC_STRIPE_PRICE_ID`.

## 4. Configurar el Portal de Cliente

Stripe incluye un portal para que los usuarios gestionen sus suscripciones:
1. Ve a **Settings** (Engranaje) -> **Billing** -> **Customer portal**.
2. Haz clic en **"Activate link"** y asegúrate de permitir que los clientes cancelen sus suscripciones. Guarda los cambios.

## 5. Webhooks Locales mediante Stripe CLI 🪄

Para probar los pagos localmente, necesitamos Stripe CLI. Esto reenvía los eventos de pago a tu `localhost`.

### Instalación en Windows
En una terminal (PowerShell) con permisos normales, ejecuta:
```bash
winget install Stripe.StripeCli
```

### Troubleshoting: "stripe: comando no reconocido"
Si tras instalar recibes este error, significa que Visual Studio Code aún tiene cargadas las variables de entorno antiguas. 
- **Solución Ideal:** Cierra VS Code por completo y vuelve a abrirlo.
- **Solución Rápida (Sin reiniciar):** Usa la ruta absoluta donde `winget` instala Stripe:
  ```bash
  C:\Users\Khris\AppData\Local\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe
  ```

### Iniciar Sesión y Escuchar Eventos
1. Haz login en Stripe CLI:
   ```bash
   stripe login
   # O si usas la ruta absoluta:
   C:\Users\Khris\AppData\Local\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe login
   ```
   Te abrirá el navegador para autorizar la conexión.

2. Abre el canal de escucha hacia tu API local:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   # O si usas la ruta absoluta:
   C:\Users\Khris\AppData\Local\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. La terminal te dirá: `Ready! Your webhook signing secret is whsec_...`
4. Copia ese código `whsec_...` y pégalo en tu `.env.local` en la variable `STRIPE_WEBHOOK_SECRET`.
*(Esta terminal debe quedarse abierta corriendo para recibir los eventos).*

## 6. Probar un Pago Exitoso

Con las 4 variables en tu `.env.local`:
1. Levanta el servidor: `npm run dev`.
2. Inicia sesión en la aplicación, ve a **Ajustes** y haz clic en suscribirte.
3. Utiliza la tarjeta de pruebas de Stripe:
   - **Número:** `4242 4242 4242 4242`
   - **Fecha de expiración:** Cualquier fecha en el futuro (ej. `12/28`)
   - **CVC:** `123`
4. Confirma el pago. Si todo salió bien, verás el evento `checkout.session.completed` entrar por la terminal donde dejaste corriendo `stripe listen`.
