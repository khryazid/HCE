# docs/DESIGN_SYSTEM.md

## 1. Vibe y Principios Estéticos
- **Estilo:** SaaS Moderno Corporativo.
- **UX:** Flujos guiados, alta accesibilidad, "Cero Curva de Aprendizaje".
- **Accesibilidad:** Soporte estricto para Modo Claro y Modo Oscuro con contrastes WCAG AAA. Prohibido el texto ilegible en transiciones de tema.

## 2. Jerarquía Tipográfica
Se utilizará **Inter** o **Plus Jakarta Sans** (importada vía `next/font`).
- H1: `text-4xl font-extrabold tracking-tight`
- H2: `text-2xl font-bold tracking-tight`
- Body: `text-base font-normal text-foreground/90`
- Small: `text-sm font-medium text-muted-foreground`

## 3. Paleta Semántica (Variables CSS en globals.css)
Se requiere el uso de variables de Tailwind para soportar la inversión de colores automática.
- **Primary:** Tonos azules (`bg-blue-600` claro, `bg-blue-500` oscuro) para confianza y calma médica.
- **Background:** - Claro: `#F8FAFC` (Slate 50)
  - Oscuro: `#0F172A` (Slate 900)
- **Foreground (Texto):** Contrastes estrictos para legibilidad.
  - Claro: `#020617` (Slate 950)
  - Oscuro: `#F8FAFC` (Slate 50)
- **Muted/Borders:** Grises suaves para delimitar áreas sin sobrecargar visualmente.

## 4. Reglas Estéticas Negativas (Strict Constraints)
- NUNCA usar diseño plano sin profundidad; SIEMPRE usar sombras suaves (`shadow-sm`, `shadow-md`) en tarjetas y modales.
- NUNCA usar colores grises claros sobre fondos blancos o grises oscuros sobre fondos negros que no cumplan un ratio de contraste 4.5:1.
- NUNCA dejar un elemento interactivo sin estados `:hover`, `:focus` y `:active` (retroalimentación visual obligatoria).

## 5. Inventario de Componentes UI (shadcn/ui)
Importar secuencialmente a través de la CLI de shadcn:
`Button`, `Card`, `Input`, `Label`, `Dialog` (Modales), `Sheet` (Paneles laterales), `Table`, `DropdownMenu`, `Toast` (Notificaciones), `Tabs` (Para separar Historia, Récipes y Órdenes).