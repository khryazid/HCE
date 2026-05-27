/**
 * ═══════════════════════════════════════════════════════════════
 *  Shared design tokens and helpers for Glyphix redesign prototypes
 * ═══════════════════════════════════════════════════════════════
 */

export const FONT_IMPORTS = `
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
`;

export const TOKENS_CSS = `
  --bg:             #FAFAF8;
  --bg-elevated:    #FFFFFF;
  --bg-soft:        #F0F0EC;
  --bg-hover:       #E8E8E3;
  --ink:            #1A1A18;
  --ink-soft:       #6B6B63;
  --ink-faint:      #A3A39B;
  --border:         #E2E2DC;
  --border-subtle:  #ECECEA;
  --accent:         #C4602A;
  --accent-hover:   #A84F22;
  --accent-dim:     rgba(196, 96, 42, 0.08);
  --accent-glow:    rgba(196, 96, 42, 0.18);
  --state-ok:       #16803C;
  --state-ok-bg:    rgba(22, 128, 60, 0.08);
  --state-warn:     #B45309;
  --state-warn-bg:  rgba(180, 83, 9, 0.08);
  --state-alert:    #B91C1C;
  --state-alert-bg: rgba(185, 28, 28, 0.07);
  --shadow-sm:      0 1px 3px rgba(26, 26, 24, 0.04);
  --shadow:         0 4px 16px rgba(26, 26, 24, 0.06), 0 1px 3px rgba(26, 26, 24, 0.04);
  --shadow-lg:      0 20px 48px rgba(26, 26, 24, 0.08), 0 4px 12px rgba(26, 26, 24, 0.04);
  --radius-xs:      4px;
  --radius-sm:      6px;
  --radius:         10px;
  --radius-lg:      14px;
  --radius-xl:      20px;
  --font-display:   'Satoshi', system-ui, sans-serif;
  --font-ui:        'Outfit', system-ui, sans-serif;
  --font-mono:      'JetBrains Mono', 'Consolas', monospace;
  --ease-out:       cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out:    cubic-bezier(0.77, 0, 0.175, 1);
  --ease-micro:     cubic-bezier(0.16, 1, 0.3, 1);
`;

export const DARK_TOKENS_CSS = `
  --bg:             #0C0C0A;
  --bg-elevated:    #151513;
  --bg-soft:        #1C1C1A;
  --bg-hover:       #252522;
  --ink:            #F5F5F0;
  --ink-soft:       #A3A39B;
  --ink-faint:      #5C5C56;
  --border:         #2A2A26;
  --border-subtle:  #222220;
  --accent:         #D4763A;
  --accent-hover:   #E08844;
  --accent-dim:     rgba(212, 118, 58, 0.12);
  --accent-glow:    rgba(212, 118, 58, 0.22);
  --state-ok-bg:    rgba(22, 128, 60, 0.12);
  --state-warn-bg:  rgba(180, 83, 9, 0.12);
  --state-alert-bg: rgba(185, 28, 28, 0.10);
  --shadow-sm:      0 1px 3px rgba(0, 0, 0, 0.35);
  --shadow:         0 4px 20px rgba(0, 0, 0, 0.45);
  --shadow-lg:      0 20px 48px rgba(0, 0, 0, 0.55);
`;
