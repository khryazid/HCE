---
name: dark-luxury-landing
description: >
  Create magnificent, production-grade dark landing pages with cinematic scroll animations,
  glassmorphism, editorial typography, and micro-interactions. Use when the user asks to
  build a landing page, hero section, marketing page, or any high-impact web presence that
  should feel premium, modern, and memorable. Especially suited for SaaS, tech, medical,
  fintech, or any product that needs to convey trust + innovation.
license: MIT
---

# Dark Luxury Landing Page — Skill

This skill produces **single-file HTML landing pages** (or React components) that feel
cinematic, polished, and alive. Every design decision — color, typography, layout, tone —
is derived from a brand discovery conversation with the user. **Never assume the aesthetic.
Always ask first.**

---

## 0. Brand Discovery — MANDATORY FIRST STEP

**Before writing a single line of code or choosing any color, font, or layout, Claude MUST
run the brand discovery flow below.** The design should emerge from the brand's identity,
not from Claude's defaults.

### 0.1 When to run discovery

Run the full discovery flow when:
- The user asks for a new landing page
- The user provides a README, brief, or product description
- There is no prior design system or brand guide to reference

Skip discovery (and jump to section 1) only when:
- The user has already answered all discovery questions in a previous message
- The user explicitly says "use these exact settings: ..." with full brand specs

### 0.2 The Discovery Questions

Ask these questions in **one single message**, grouped naturally. Do NOT ask them one by one
across multiple turns — that is annoying. Present them conversationally, not as a numbered
interrogation.

Present the questions using interactive option buttons where possible (single-select or
multi-select), and leave open fields for text answers. Here is the canonical discovery prompt:

---

**Discovery prompt template (adapt wording to context):**

> Antes de diseñar, necesito entender tu marca para que el resultado sea tuyo, no genérico.
> Te hago algunas preguntas rápidas:

**Bloque 1 — Identidad de marca**

1. **¿Cómo se llama el producto o empresa?** *(si no lo diste aún)*
2. **¿Cuál es el tono de la marca?**
   - [ ] Serio y profesional
   - [ ] Moderno y técnico
   - [ ] Cálido y cercano
   - [ ] Lujoso y exclusivo
   - [ ] Juguetón y creativo
   - [ ] Otro: ___

3. **¿A quién le habla principalmente la landing?**
   - [ ] Profesionales independientes
   - [ ] Empresas / equipos (B2B)
   - [ ] Consumidores finales (B2C)
   - [ ] Inversores / stakeholders
   - [ ] Otro: ___

**Bloque 2 — Estética visual**

4. **¿Tenés colores de marca definidos?** *(hex, nombre, o "no tengo")*

5. **¿Qué fondo preferís para la landing?**
   - [ ] Oscuro (dark mode — espacial, premium, tecnológico)
   - [ ] Claro (light mode — limpio, confiable, accesible)
   - [ ] El que mejor represente la marca (dejá que Claude decida)

6. **¿Hay alguna referencia visual que te guste?** *(URLs, nombres de marcas, o "ninguna")*
   Ejemplos: "algo como Linear", "estilo Apple", "tipo Stripe", "como la landing que hiciste para Glyph"

7. **¿Qué sensación debe generar la landing en quien la ve?**
   - [ ] Confianza / seguridad
   - [ ] Innovación / futuro
   - [ ] Eficiencia / velocidad
   - [ ] Exclusividad / lujo
   - [ ] Simplicidad / claridad
   - [ ] Otro: ___

**Bloque 3 — Contenido**

8. **¿Tenés un tagline o headline principal?** *(o querés que Claude lo proponga)*

9. **¿Cuáles son las 3–5 features o beneficios más importantes a destacar?**

10. **¿Tenés precios definidos para mostrar?** *(sí / no / mostrar solo "contactanos")*

11. **¿Hay testimonios, métricas o logos de clientes para incluir?**

12. **¿A dónde debe llevar el CTA principal?** *(URL de registro, formulario, WhatsApp, etc.)*

---

### 0.3 Processing Discovery Answers

Once the user answers, build a **Brand Brief** internally before coding:

```
BRAND BRIEF
───────────────────────────────
Nombre:          [product name]
Tono:            [selected tone]
Audiencia:       [target audience]
Color primario:  [hex or derived from tone]
Color acento:    [derived from brand color or chosen]
Fondo:           [dark / light / decided]
Referencia:      [visual reference or none]
Sensación:       [selected feeling(s)]
Headline:        [user-provided or Claude-proposed]
Features:        [list of 3-5]
Precios:         [plan structure or none]
Prueba social:   [testimonials / metrics / none]
CTA destino:     [URL]
```

Only after building this brief, proceed to section 1 and make all design decisions based on it.

### 0.4 Deriving Design Decisions from the Brief

| Brief field         | Design decision it drives                                      |
|---------------------|----------------------------------------------------------------|
| Tono → Serio        | Serif display font, dark palette, minimal animations           |
| Tono → Lujoso       | Cormorant Garamond, deep navy, gold accent, slow reveal        |
| Tono → Juguetón     | Rounded sans (Nunito/Sora), bright accent, bouncy keyframes    |
| Tono → Técnico      | Monospaced elements, code blocks in mock UI, blue/purple accent|
| Fondo → Claro       | Use the Light Palette variant (section 2.1)                    |
| Color de marca      | Use directly as `--accent`; derive `--accent-dim` at 10% alpha |
| Referencia → Stripe | Clean sections, bold numbers, minimal decoration               |
| Referencia → Linear | Dark, crisp, monospace details, subtle grid                    |
| Referencia → Apple  | Massive whitespace, product-centric, black/white + 1 accent    |
| Sensación → Lujo    | Generous spacing, serif headlines, slow stagger (120ms)        |
| Sensación → Velocidad | Tight spacing, bold metrics, fast reveals (50ms stagger)     |

---

## 1. Design Philosophy

Before writing a single line of code, commit to these principles:

### 1.1 One Accent Color Rules Everything
Pick **one hero accent** (teal, electric blue, warm gold, coral, etc.) and use it sparingly
but consistently: glows, borders on hover, badges, key numbers, icon backgrounds. The rest
is grayscale. Restraint is power.

### 1.2 Typography Contrast is the Layout
Pair a **distinctive serif display font** (Cormorant Garamond, Playfair Display, DM Serif
Display, Libre Baskerville) with a **clean grotesque body font** (DM Sans, Outfit, Plus
Jakarta Sans, Sora). Never Inter, Roboto, or Arial. Load from Google Fonts CDN.

### 1.3 Motion is the Differentiator
Static dark sites look like every other SaaS homepage. Scroll-triggered reveals, staggered
card entrances, and subtle hover micro-interactions make the page feel alive. Every meaningful
element should animate exactly once — when the user first sees it.

### 1.4 Depth Through Layering
Create depth without 3D: grid backgrounds, radial glow spots, glass surfaces (low-opacity
fill + border), and careful use of `box-shadow`. Nothing should feel flat or pasted-on.

---

## 2. Color System

Define all colors as CSS variables at `:root`. This is the canonical dark palette template —
swap the accent as needed:

```css
:root {
  /* ── BACKGROUNDS (darkest → lightest) ── */
  --bg:    #030d1a;   /* page base — near-black navy */
  --bg1:   #061223;   /* section alternate background */
  --bg2:   #0a1a30;   /* card / panel background */

  /* ── ACCENT (swap this for the brand color) ── */
  --accent:      #00d4aa;           /* primary accent — teal */
  --accent2:     #00ffe5;           /* accent hover / brighter */
  --accent-dim:  rgba(0,212,170,.10); /* subtle tinted fill */
  --accent-line: rgba(0,212,170,.18); /* borders on hover states */

  /* ── SECONDARY ACCENT (optional warm counterpoint) ── */
  --gold:     #c8a84b;
  --gold-dim: rgba(200,168,75,.08);

  /* ── TEXT ── */
  --text:  #e8f0ff;   /* primary text */
  --text2: #7a90b0;   /* secondary / body copy */
  --text3: #4a5f7a;   /* muted / footnotes / labels */

  /* ── STRUCTURAL ── */
  --line:   rgba(255,255,255,.06);   /* subtle dividers */
  --line2:  rgba(0,212,170,.15);     /* accent-tinted borders */
  --glass:  rgba(255,255,255,.03);   /* glass card fill */
  --glass2: rgba(255,255,255,.06);   /* glass card fill — hover */

  /* ── RADII ── */
  --r:  12px;
  --r2: 20px;
}
```

### 2.1 Light Palette Variant

When the user selects "Fondo claro" in discovery, swap to this palette:

```css
:root {
  --bg:    #f8f9fc;
  --bg1:   #f0f2f8;
  --bg2:   #e8ecf4;

  --accent:      #0057ff;           /* adjust to brand color */
  --accent2:     #2b77ff;
  --accent-dim:  rgba(0,87,255,.08);
  --accent-line: rgba(0,87,255,.2);

  --text:  #0d1117;
  --text2: #4a5568;
  --text3: #94a3b8;

  --line:   rgba(0,0,0,.07);
  --line2:  rgba(0,87,255,.15);
  --glass:  rgba(255,255,255,.7);
  --glass2: rgba(255,255,255,.9);
}
/* Also remove the grid body::before or lower its opacity to .2 */
```

### Accent Color Swaps for Different Brands

| Brand Type       | `--accent`  | `--accent2` | `--accent-dim`           |
|------------------|-------------|-------------|--------------------------|
| Medical / Health | `#00d4aa`   | `#00ffe5`   | `rgba(0,212,170,.10)`    |
| Fintech / Legal  | `#4f8ef7`   | `#7eaaff`   | `rgba(79,142,247,.10)`   |
| Creative Agency  | `#f05d5e`   | `#ff8182`   | `rgba(240,93,94,.10)`    |
| AI / SaaS        | `#a78bfa`   | `#c4b5fd`   | `rgba(167,139,250,.10)`  |
| Real Estate      | `#c8a84b`   | `#e6c56a`   | `rgba(200,168,75,.10)`   |

---

## 3. Typography

Always load from Google Fonts. Use the `display=swap` flag. Keep it to 2 font families max.

```html
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet"/>
```

### Typography Scale

```css
/* Display / Hero headline */
.display {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(3rem, 7vw, 6.5rem);
  font-weight: 300;
  line-height: 1.05;
  letter-spacing: -.03em;
}

/* Section title */
.section-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 300;
  line-height: 1.15;
  letter-spacing: -.02em;
}

/* Card title */
.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.35rem;
  font-weight: 400;
}

/* Body */
body {
  font-family: 'DM Sans', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.65;
  color: var(--text);
}

/* Section eyebrow label */
.section-label {
  font-size: .73rem;
  font-weight: 500;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--accent);
}
```

### Italic for Emphasis
Use `<em>` inside serif headlines to inject a beautiful italic accent on the keyword:
```html
<h1>The clinical engine for <em>modern</em> doctors</h1>
```
Style it: `em { font-style: italic; color: var(--accent); }`

---

## 4. Background Layers

Stack these layers on `body` to create depth:

```css
/* 1. Base background */
body { background: var(--bg); }

/* 2. Grid overlay (always-on structural depth) */
body::before {
  content: '';
  position: fixed; inset: 0;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
  opacity: .5;
}

/* 3. Radial glow spots (per-section, positioned absolutely) */
.section-glow {
  position: absolute;
  width: 700px; height: 700px;
  background: radial-gradient(circle, var(--accent-dim) 0%, transparent 70%);
  pointer-events: none;
  /* Position: top/left/right/bottom per section */
}
```

---

## 5. Scroll Animation System

This is the core of what makes the page feel alive. Copy this pattern exactly.

### 5.1 CSS Classes

```css
/* All animated elements start invisible */
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1);
}
.reveal-left {
  opacity: 0;
  transform: translateX(-30px);
  transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1);
}
.reveal-right {
  opacity: 0;
  transform: translateX(30px);
  transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1);
}

/* Activated state */
.reveal.visible,
.reveal-left.visible,
.reveal-right.visible {
  opacity: 1;
  transform: none;
}
```

### 5.2 IntersectionObserver with Stagger

```javascript
const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      // Stagger siblings: each sibling reveals 80ms after the previous
      const siblings = entry.target.parentElement
        .querySelectorAll('.reveal, .reveal-left, .reveal-right');
      let idx = 0;
      siblings.forEach((s, j) => { if (s === entry.target) idx = j; });
      
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, idx * 80); // 80ms stagger per element
      
      observer.unobserve(entry.target); // animate only once
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px' // trigger slightly before fully in view
});

reveals.forEach(el => observer.observe(el));
```

### 5.3 Applying Delays to Stagger Within a Card Group

When a grid of cards should stagger, add nth-child delays:

```css
.card-grid > *:nth-child(1) { transition-delay: .00s }
.card-grid > *:nth-child(2) { transition-delay: .07s }
.card-grid > *:nth-child(3) { transition-delay: .14s }
.card-grid > *:nth-child(4) { transition-delay: .21s }
.card-grid > *:nth-child(5) { transition-delay: .28s }
.card-grid > *:nth-child(6) { transition-delay: .35s }
```

---

## 6. Component Library

### 6.1 Navigation (Sticky with Scroll Effect)

```html
<nav id="nav">
  <a href="#" class="nav-logo">
    <div class="nav-logo-dot"></div>
    Brand<span>·</span>
  </a>
  <div class="nav-links">
    <a href="#features">Funciones</a>
    <a href="#pricing">Precios</a>
  </div>
  <div class="nav-cta">
    <a href="/login" class="btn-ghost">Iniciar sesión</a>
    <a href="/registro" class="btn-primary">Empezar gratis</a>
  </div>
</nav>
```

```css
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 20px 40px;
  display: flex; align-items: center; justify-content: space-between;
  transition: all .4s ease;
}
nav.scrolled {
  background: rgba(3,13,26,.85);
  backdrop-filter: blur(20px);
  padding: 14px 40px;
  border-bottom: 1px solid var(--line2);
}
.nav-logo-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent);
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%,100% { box-shadow: 0 0 0 0 rgba(0,212,170,.4) }
  50%      { box-shadow: 0 0 0 5px rgba(0,212,170,0) }
}
```

```javascript
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });
```

### 6.2 Hero Section Structure

```html
<section class="hero">
  <div class="hero-glow"></div>        <!-- radial glow behind content -->
  <div>
    <!-- 1. Eyebrow badge -->
    <div class="hero-badge">Product · Now available</div>

    <!-- 2. Headline with overflow:hidden for slide-up reveal -->
    <h1 class="hero-title">
      <span class="line"><span>First line of headline</span></span>
      <span class="line"><span>Second line with <em>accent</em></span></span>
    </h1>

    <!-- 3. Subheadline -->
    <p class="hero-sub">One or two sentence value proposition.</p>

    <!-- 4. CTAs -->
    <div class="hero-actions">
      <a href="/registro" class="btn-hero">Primary CTA →</a>
      <a href="#features" class="btn-hero-ghost">Secondary CTA</a>
    </div>

    <!-- 5. Trust note -->
    <p class="hero-note">No credit card · 2-minute setup</p>

    <!-- 6. Key stats bar -->
    <div class="hero-stats">
      <div class="hero-stat">
        <span class="hero-stat-num">∞</span>
        <span class="hero-stat-label">Unlimited X</span>
      </div>
      <!-- repeat... -->
    </div>
  </div>
</section>
```

**Headline slide-up animation (word-by-word reveal):**
```css
.hero-title .line { display: block; overflow: hidden; }
.hero-title .line span {
  display: block;
  animation: slideUp .8s cubic-bezier(.16,1,.3,1) both;
}
.hero-title .line:nth-child(1) span { animation-delay: .1s }
.hero-title .line:nth-child(2) span { animation-delay: .25s }
.hero-title .line:nth-child(3) span { animation-delay: .4s }

@keyframes slideUp {
  from { transform: translateY(100%) }
  to   { transform: translateY(0) }
}
```

### 6.3 Bento Grid (Features)

Bento is a mixed grid where some cards span 2 columns or 2 rows, creating visual variety.

```html
<div class="bento">
  <div class="bento-card wide">  <!-- 2 cols -->
    <div class="card-icon">⚡</div>
    <h3>Wide feature card</h3>
    <p>Description text...</p>
    <div class="card-big-num">3min</div>
  </div>
  <div class="bento-card">       <!-- 1 col -->
    <div class="card-icon">📄</div>
    <h3>Normal card</h3>
    <p>Description...</p>
    <span class="card-tag">Tag label</span>
  </div>
  <!-- ... more cards ... -->
</div>
```

```css
.bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.bento-card {
  background: var(--glass);
  border: 1px solid var(--line);
  border-radius: var(--r2);
  padding: 2rem;
  transition: all .3s ease;
  position: relative; overflow: hidden;
}
.bento-card::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, var(--accent-dim), transparent);
  opacity: 0; transition: opacity .3s;
}
.bento-card:hover { border-color: var(--line2); transform: translateY(-4px); }
.bento-card:hover::before { opacity: 1; }
.bento-card.wide { grid-column: span 2 }
.bento-card.tall { grid-row: span 2 }
.card-icon {
  width: 42px; height: 42px;
  background: var(--accent-dim); border: 1px solid var(--line2);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1.2rem; font-size: 1.2rem;
}
.card-big-num {
  font-family: 'Cormorant Garamond', serif;
  font-size: 3.5rem; font-weight: 300; color: var(--accent);
  line-height: 1; margin: 1rem 0 .5rem;
}
.card-tag {
  display: inline-block; margin-top: 1rem;
  padding: 4px 12px; background: var(--accent-dim);
  border-radius: 100px; font-size: .72rem; color: var(--accent);
  font-weight: 500; letter-spacing: .05em;
}
```

**3D Tilt on hover (JavaScript):**
```javascript
document.querySelectorAll('.bento-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `translateY(-4px) rotateX(${-y*4}deg) rotateY(${x*4}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});
```

### 6.4 Split Section (Text + Visual)

Used for feature callouts — AI panel, offline mode, integrations:

```html
<div class="split">
  <div class="split-visual reveal-left">
    <!-- screenshot, mock UI, code block, or illustration -->
  </div>
  <div class="split-content reveal-right">
    <span class="section-label">Feature name</span>
    <h2 class="section-title">Headline for<br/>this feature</h2>
    <p>Body copy...</p>
    <ul class="check-list">
      <li>Benefit one</li>
      <li>Benefit two</li>
      <li>Benefit three</li>
    </ul>
  </div>
</div>
```

```css
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5rem;
  align-items: center;
}
.check-list { list-style: none; display: flex; flex-direction: column; gap: .8rem; }
.check-list li {
  display: flex; align-items: flex-start; gap: 12px;
  font-size: .9rem; color: var(--text2); line-height: 1.5;
}
.check-list li::before {
  content: '';
  width: 18px; height: 18px; flex-shrink: 0;
  background: var(--accent-dim); border: 1px solid var(--line2);
  border-radius: 50%; margin-top: 2px;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 8l3.5 3.5L13 4' stroke='%2300d4aa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 12px; background-repeat: no-repeat; background-position: center;
}
```

> **Note:** Replace `%2300d4aa` in the SVG URL with the URL-encoded version of your accent color.

### 6.5 Mock UI Panel (App Screenshot Alternative)

When you don't have screenshots, build a convincing in-page mock of the product:

```html
<div class="mock-panel">
  <div class="mock-top">
    <div class="dot dot-r"></div>
    <div class="dot dot-y"></div>
    <div class="dot dot-g"></div>
    <span>app name — feature name</span>
  </div>
  <div class="mock-body">
    <!-- fake UI: tables, rows, code blocks, inputs -->
  </div>
</div>
```

```css
.mock-panel {
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--r2);
  overflow: hidden;
}
.mock-top {
  padding: .7rem 1rem;
  background: rgba(0,0,0,.3);
  border-bottom: 1px solid var(--line);
  display: flex; align-items: center; gap: 6px;
  font-size: .73rem; color: var(--text3);
}
.dot { width: 10px; height: 10px; border-radius: 50% }
.dot-r { background: #ff5f57 }
.dot-y { background: #febc2e }
.dot-g { background: #28c840 }
```

### 6.6 Pricing Cards

```css
.pricing-card {
  background: var(--glass);
  border: 1px solid var(--line);
  border-radius: var(--r2);
  padding: 2.5rem;
  transition: all .3s;
  position: relative; overflow: hidden;
}
.pricing-card.featured {
  background: linear-gradient(135deg, var(--accent-dim), var(--glass));
  border-color: var(--line2);
}
.pricing-card.featured::before {
  content: 'Most popular'; /* or localized */
  position: absolute; top: 16px; right: 16px;
  padding: 3px 12px;
  background: var(--accent); color: #020d18;
  border-radius: 100px; font-size: .68rem; font-weight: 600;
}
.price-amount {
  font-family: 'Cormorant Garamond', serif;
  font-size: 3rem; font-weight: 300; line-height: 1;
}
```

### 6.7 Testimonial Cards

```css
.testimonial-card {
  background: var(--glass);
  border: 1px solid var(--line);
  border-radius: var(--r2);
  padding: 2rem;
  position: relative; overflow: hidden;
  transition: all .3s;
}
.testimonial-card::before {
  content: '"';
  position: absolute; top: -10px; right: 24px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 8rem; font-weight: 300;
  color: var(--accent); opacity: .08;
  line-height: 1; pointer-events: none;
}
.testimonial-card:hover { border-color: var(--line2); transform: translateY(-4px); }
```

### 6.8 Buttons

```css
/* Primary CTA */
.btn-primary {
  padding: 9px 22px;
  background: var(--accent); color: #020d18;
  border: none; border-radius: 8px; font-size: .87rem; font-weight: 500;
  cursor: pointer; text-decoration: none; transition: all .2s;
}
.btn-primary:hover { background: var(--accent2); transform: translateY(-1px); }

/* Ghost / secondary */
.btn-ghost {
  padding: 9px 20px;
  background: transparent; border: 1px solid var(--line2);
  color: var(--accent); border-radius: 8px; font-size: .87rem;
  cursor: pointer; text-decoration: none; transition: all .2s;
}
.btn-ghost:hover { background: var(--accent-dim); }

/* Hero CTAs (larger) */
.btn-hero {
  padding: 14px 32px;
  background: var(--accent); color: #020d18;
  border: none; border-radius: 10px; font-size: .97rem; font-weight: 500;
  cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; gap: 8px;
  transition: all .25s;
}
.btn-hero:hover {
  background: var(--accent2);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,212,170,.25); /* use accent color */
}
```

### 6.9 Section Divider

Between sections, use a gradient line instead of a solid border:

```css
.divider {
  width: 100%; height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--line2) 30%,
    var(--line2) 70%,
    transparent
  );
}
```

### 6.10 Cursor Blob (Desktop Delight)

Adds a soft glowing blob that follows the cursor — feels premium:

```html
<div class="cursor-blob" id="cursorBlob"></div>
```

```css
.cursor-blob {
  position: fixed;
  width: 300px; height: 300px; border-radius: 50%;
  background: radial-gradient(circle, var(--accent-dim) 0%, transparent 70%);
  pointer-events: none; z-index: 0;
  transform: translate(-50%, -50%);
  transition: left .1s ease-out, top .1s ease-out;
}
```

```javascript
const blob = document.getElementById('cursorBlob');
document.addEventListener('mousemove', e => {
  blob.style.left = e.clientX + 'px';
  blob.style.top = e.clientY + 'px';
});
```

---

## 7. Page Anatomy

A complete dark luxury landing should follow this section order:

| # | Section       | Animation          | Layout                     |
|---|---------------|--------------------|----------------------------|
| 1 | Nav           | Frosted glass on scroll | Fixed, full-width     |
| 2 | Hero          | Slide-up headline, fadeUp badge/CTAs | Full viewport, centered |
| 3 | Divider       | —                  | 1px gradient line          |
| 4 | Features      | Stagger reveal     | Bento grid 3-col           |
| 5 | Divider       | —                  | 1px gradient line          |
| 6 | Key Feature   | Left/Right reveal  | Split 2-col (visual + text)|
| 7 | Divider       | —                  | 1px gradient line          |
| 8 | Social Proof  | Stagger reveal     | 2-col testimonial grid     |
| 9 | Divider       | —                  | 1px gradient line          |
| 10| Pricing       | Reveal             | 2-col pricing cards        |
| 11| Divider       | —                  | 1px gradient line          |
| 12| Final CTA     | FadeUp             | Centered, full-width       |
| 13| Footer        | —                  | Flex row                   |

---

## 8. Responsive Rules

```css
@media (max-width: 768px) {
  /* Nav: hide links, keep logo + CTAs */
  .nav-links { display: none }
  
  /* Bento: stack to single column */
  .bento { grid-template-columns: 1fr }
  .bento-card.wide { grid-column: span 1 }
  
  /* Split sections: stack vertically */
  .split { grid-template-columns: 1fr; gap: 3rem }
  
  /* Pricing: stack */
  .pricing-grid { grid-template-columns: 1fr }
  
  /* Hero stats: wrap */
  .hero-stats { flex-wrap: wrap; gap: 24px }
  .hero-stat  { border-right: none; padding: 0 1.5rem }
  
  /* Footer: stack */
  footer { flex-direction: column; align-items: flex-start }
}
```

---

## 9. Performance & Quality Checklist

Before delivering the page, verify:

- [ ] All images replaced with SVG/CSS illustrations or mock UIs (no external images)
- [ ] Google Fonts loaded with `display=swap` and `preconnect`
- [ ] `IntersectionObserver` fires `observer.unobserve()` after first reveal
- [ ] Nav scroll listener uses `{ passive: true }`
- [ ] All interactive JS wrapped in null-guards (`if (element) ...`)
- [ ] `.cursor-blob` has `pointer-events: none` so it doesn't block clicks
- [ ] Bento tilt effect resets on `mouseleave`
- [ ] Custom scrollbar styled (`::-webkit-scrollbar`)
- [ ] `body { overflow-x: hidden }` to prevent horizontal scroll
- [ ] All CTAs link to the correct `href` from the product's README

---

## 10. Full HTML Boilerplate

Start every landing with this shell:

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Product — Tagline</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet"/>
<style>
  /* 1. CSS variables */
  /* 2. Reset + base */
  /* 3. Background layers (grid, glows) */
  /* 4. Nav */
  /* 5. Hero */
  /* 6. Scroll reveal classes */
  /* 7. Section commons */
  /* 8. Components (bento, split, pricing, testimonials, buttons) */
  /* 9. Dividers */
  /* 10. Footer */
  /* 11. Keyframes */
  /* 12. Responsive */
</style>
</head>
<body>
<div class="cursor-blob" id="cursorBlob"></div>
<nav id="nav">...</nav>
<section class="hero">...</section>
<!-- sections... -->
<footer>...</footer>

<script>
  // 1. Cursor blob
  // 2. Nav scroll effect
  // 3. IntersectionObserver reveals
  // 4. Bento tilt
  // 5. Smooth scroll for anchor links
</script>
</body>
</html>
```

---

## 11. Usage Instructions for Claude

### The Golden Rule
**The design must emerge from the brand, not from Claude's defaults.**
Never assume a color, font, or layout. Always derive them from the Brand Brief built in section 0.

### Step-by-Step Workflow

```
1. READ this SKILL.md (you're doing that now ✓)

2. RUN DISCOVERY (section 0)
   → Send the discovery questions in ONE message
   → Wait for user answers
   → Build the Brand Brief internally

3. DERIVE DESIGN DECISIONS (section 0.4)
   → Map every brief field to a concrete design choice
   → Confirm with user if anything is ambiguous:
     "Con el tono lujoso y el color #2c3e50 voy a usar una paleta
      oscura profunda con acento en dorado cálido — ¿de acuerdo?"

4. BUILD THE PAGE
   → Apply color system (section 2) from brief
   → Apply typography (section 3) from brief tone
   → Construct sections following the Page Anatomy (section 7)
   → Use actual product content — no Lorem Ipsum, no generic placeholders
   → Build a Mock UI panel (section 6.5) showing the real product
   → Apply all scroll reveals (section 5)

5. VALIDATE checklist (section 9)

6. DELIVER as single .html file to /mnt/user-data/outputs/
   → Present with present_files tool
   → Mention 2-3 specific design decisions made from their brief
     (e.g. "Usé Playfair Display por el tono lujoso que pediste,
      y el acento en coral porque mencionaste que Airbnb era tu referencia")
```

### What Good Looks Like

✅ Accent color derived from brand hex provided by user
✅ Typography chosen based on tone (not defaulting to Cormorant every time)
✅ Headline written or refined based on user's tagline + audience
✅ Bento cards contain the actual 3-5 features the user listed
✅ Mock UI panel shows the real product flow, not a generic dashboard
✅ Stagger speed matches brand feeling (slow for luxury, fast for tech)
✅ CTA links to the actual URL the user specified

### What to Avoid

❌ Starting to code before running discovery
❌ Using the same dark navy + teal palette for every project
❌ Defaulting to Cormorant Garamond when the brand is playful or technical
❌ Generic feature descriptions ("Gestión inteligente de X")
❌ Placeholder CTAs that say "#" or "javascript:void(0)"
❌ Ignoring the user's visual reference (if they said "like Linear", honor that)

The output should look like it was designed specifically for this brand —
someone who knows the product should recognize it immediately from the design alone.
