# SIRUJUK Anti Fraud — Design System

Design guidelines derived from the logo: a navy shield holding a teal medical cross, with a small network of nodes breaking out of the shield edge. The mark says three things: **protection**, **healthcare**, **detection through connected data**. Every design decision below should support those three ideas and stay calm enough for people who review claims for hours.

---

## 1. Principles

1. **Calm over punchy.** Users are verifiers, auditors and clinicians on long sessions. Prefer quiet surfaces and low saturation.
2. **Color has a job.** Navy = structure and action. Teal = insight and data. Warm colors = risk and attention. Nothing is decorative.
3. **Never color alone.** Every status carries an icon or text label as well as a color.
4. **Flat and honest.** No gradients, glows, glassmorphism or stock illustration. Use thin lines, solid fills and real data.
5. **Network motif, used sparingly.** The node-and-line detail from the logo appears only in meaningful places (relationship graphs, empty states, loaders). Never as wallpaper.

---

## 2. Logo

- **Primary:** shield + cross mark, wordmark "SIRUJUK", tagline "Anti Fraud", horizontal lockup.
- **Clear space:** at least the height of the "I" in SIRUJUK on all sides.
- **Minimum size:** 120 px wide for the full lockup; 24 px for the shield mark alone.
- **Backgrounds:** full-color logo on Clinic White, Mist or white. On Night or Navy, use the reversed version (shield outline and wordmark in Frost, cross and nodes in Lifted Teal).
- **Don't:** recolor, add shadows, stretch, rotate, or place on photographs or busy patterns.

---

## 3. Color

### 3.1 Brand core

Actual values in use (`lib/sirujuk-data.ts`, `PrimaryButton.tsx`, `AppShell.tsx`).

| Token | Name | Hex | Use |
|---|---|---|---|
| `--navy` | Navy | `#1E3A5F` | Sidebar, headings, primary buttons, selection, text selection |
| `--navy-hover` | Navy Hover | `#16304F` | Primary button hover |
| `--navy-active` | Navy Active | `#2C4E78` | Active nav row, selected states |
| `--navy-row-hover` | Navy Row Hover | `#27446B` | Sidebar row hover |
| `--teal` | Signal Teal | `#2A9DA6` | Network motif nodes and small accents only |

### 3.2 Neutrals

| Token | Name | Hex | Use |
|---|---|---|---|
| `--bg` | Page | `#F4F6F9` | Page background |
| `--surface` | Surface | `#FFFFFF` | Cards, modals, inputs, list headers |
| `--border` | Border | `#DCE3EC` | Card, input, and divider borders |
| `--text` | Ink | `#0E1B2A` | Body text |
| `--text-muted` | Slate | `#56657A` | Secondary text |
| `--text-faint` | Faint | `#8A98AC` | Tertiary labels, list headers, timestamps |
| `--divider` | Divider | `#EEF1F5` | Row dividers, section borders |
| `--hover` | Hover fill | `#F8FAFC` | Row and button hover |
| `--soft` | Soft panel | `#E7ECF3` | Illustration fills, meter tracks, info rows |
| `--thumb` | Scrollbar | `#C4CFDC` | Scrollbar thumb on hover |

### 3.3 Navy interaction scale

One navy, four states. No other navy tints are in use.

| State | Hex |
|---|---|
| Default | `#1E3A5F` |
| Hover | `#16304F` |
| Active / selected | `#2C4E78` |
| Row hover on navy | `#27446B` |

### 3.4 Risk scale (three levels)

Levels differ in lightness as well as hue. Always pair with a text label, never color alone.

| Level | Solid | Soft (bg) | Text | Label |
|---|---|---|---|---|
| Rendah | `#1C8C4A` | `#E4F4EA` | `#146134` | Aman |
| Sedang | `#C77A0A` | `#FCF1E1` | `#8A5406` | Cek Lagi |
| Tinggi | `#D42828` | `#FBE9E9` | `#9B1C1C` | Perlu Dicek |

Badges use the solid fill with white text. Panels and banners use the soft fill with the text color. Source: `RISK` in `lib/sirujuk-data.ts`, rendered by `RiskBadge.tsx`.

### 3.5 Feedback states

| State | Hex | Notes |
|---|---|---|
| Error | `#9B1C1C` | Form and load errors, always with an alert icon and message. Never for large areas |
| Warning | Sedang set (`#C77A0A` / `#FCF1E1`) | Caution banners, same treatment as medium risk |

No info blue is in use. Do not introduce new feedback hues without updating this section.

### 3.6 Dark mode (reserved, not active)

The app ships light only (`color-scheme: light` in `app/tailwind.css`). A `ThemeToggle` component exists and sets `data-theme`, but no dark theme styles are defined yet, so the toggle has no visual effect. Keep the light tokens above as the single source of truth until a dark theme is actually built. When it ships, define it here first, then implement.

### 3.7 Usage ratio

- **70%** neutrals (Page `#F4F6F9`, Surface, Hover, Divider)
- **20%** Navy (sidebar, headings, primary actions)
- **8%** Teal (network motif, small accents)
- **2%** warm risk colors (only when something needs attention)

### 3.8 Contrast rules

- Body text and small text: at least **4.5:1** (WCAG AA).
- Large text (24 px or 18.5 px bold) and UI icons: at least **3:1**.
- `#2A9DA6` on white is about 3:1. Use it for nodes and large elements only. Use Navy or Ink for text.

---

## 4. Typography

The logo wordmark is a wide, geometric, bold sans. One family covers everything: headings, body, and data. Numeric alignment comes from tabular figures, not a second family.

| Role | Font | Fallback |
|---|---|---|
| Headings and UI | **Plus Jakarta Sans** (600, 700) | `system-ui, sans-serif` |
| Body | **Plus Jakarta Sans** (400, 500) | `system-ui, sans-serif` |
| Data, IDs, claim numbers | **Plus Jakarta Sans** (500, 600, 700) with `tabular-nums` | `system-ui, sans-serif` |

Use tabular numerals (`font-variant-numeric: tabular-nums`) in all tables and figures.

### Scale

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| Display | 36 / 44 | 700 | Page hero, report title |
| H1 | 28 / 36 | 700 | Page title |
| H2 | 22 / 30 | 600 | Section |
| H3 | 18 / 26 | 600 | Card title |
| Body | 16 / 24 | 400 | Default |
| Small | 14 / 20 | 400 | Table cells, captions |
| Caption | 12 / 16 | 500 | Labels, metadata (never below 12 px) |

Headings in Navy. Body in Ink. Maximum line length 70 characters.

---

## 5. Layout, spacing and shape

- **Spacing scale (4 px base):** 4, 8, 12, 16, 24, 32, 48, 64.
- **Grid:** 12 columns, 24 px gutter, max content width 1280 px. Dashboards use a fixed 240 px sidebar.
- **Radius:** 6 px for inputs and buttons, 10 px for cards, 999 px for status pills only.
- **Borders:** 1 px `--border`. Prefer borders over shadows.
- **Elevation:** one shadow only, for popovers and modals: `0 4px 16px rgba(20, 32, 46, 0.12)`.
- **Density:** comfortable by default (row height 48 px); compact option for audit tables (row height 36 px).

---

## 6. Components

### Buttons
- **Primary:** Navy fill, white text, 6 px radius. Hover `#16304F`. Focus ring below.
- **Secondary:** white fill, 1 px Navy border, Navy text.
- **Tertiary:** text only in Navy, underline on hover.
- **Destructive:** Error fill, used only for irreversible actions with a confirm step.
- Height 40 px (32 px compact). Minimum touch target 44 px on mobile.

### Inputs
- White fill, 1 px `--border`, 6 px radius. Focus: 2 px Teal outline plus 2 px offset.
- Label above the field, always visible. Placeholders are hints, never labels.
- Errors: Error color border, icon, and message text below the field.

### Risk badge
Solid-fill pill in the level color with white label text and a darker score chip (`rgba(0,0,0,0.18)`), per `RiskBadge.tsx`. Example: `Perlu Dicek 91` on `#D42828`. Status pills (`StatusBadge.tsx`) follow the same shape: `Masih antre` on `#8A98AC`, `Lagi dicek` on Navy, `Sudah beres` on Ink. Risk panels use the soft fill with the level text color and a numbered solid marker per reason.

### Tables (core of the product)
- Header row: white, faint `#8A98AC` uppercase labels, bottom border. No tinted fill.
- Rows: white with `#F8FAFC` hover. Dividers in `#EEF1F5`.
- Numeric columns right-aligned with tabular numerals.
- Claim IDs and codes in Plus Jakarta Sans with `tabular-nums`.
- Risk column always first or second, never color-only.

### Cards
White surface, 1 px border, 10 px radius, 16 to 24 px padding. No shadow.

### Alerts and banners
Tinted panel in the relevant soft fill with the level text color, icon, title, one-line description. Error text uses `#9B1C1C` with an alert icon.

### Charts
- Primary series Teal `#2A9DA6`, comparison series Navy `#1E3A5F`, meter tracks `#E7ECF3` / `#EEF1F5`.
- Risk breakdowns use the three-step risk scale in order.
- Direct labels over legends where possible. Light grid lines in `#EEF1F5`.
- No 3D, no gradients under lines, no pie charts with more than 4 slices.

### Relationship graph (fraud network view)
This is where the logo motif lives. Nodes are Teal circles with a white 2 px ring, edges are thin navy lines. Flagged nodes switch to the risk color plus a text label. Selected node gets a Navy outline.

### Navigation
Navy `#1E3A5F` sidebar with white text and a `#2C4E78` active row. Top bar is white with a bottom border.

---

## 7. Iconography

- Outline style, 1.5 px stroke, rounded joins, 24 px grid. Lucide or Phosphor (regular) both fit.
- Default color Navy; active or informational Teal.
- Medical cross is reserved for the brand mark and clinical context. Do not use it as a generic "add" icon.

---

## 8. Motion

- Short and functional: 120 to 200 ms, ease-out.
- Use motion for state change only (expanding rows, toasts, graph node focus).
- Respect `prefers-reduced-motion`: remove all non-essential animation.
- No bouncing, shimmer-everywhere or parallax.

---

## 9. Accessibility checklist

- [ ] All text meets 4.5:1, large text and icons 3:1.
- [ ] Every status has icon plus text, not color alone.
- [ ] Visible focus ring on every interactive element (2 px Teal, 2 px offset).
- [ ] Full keyboard navigation for tables, filters and the graph view.
- [ ] Touch targets of at least 44 px on mobile.
- [ ] Form errors are announced to screen readers.
- [ ] Layouts work at 200% zoom.
- [ ] Print styles use Navy plus one Teal accent and survive black-and-white output.

---

## 10. Do and don't

| Do | Don't |
|---|---|
| Use tinted neutrals (Page `#F4F6F9`, Hover, Divider) | Use stark `#FFFFFF` page backgrounds or neutral gray |
| Keep Teal under 10% of any screen | Fill large areas with Teal |
| Use warm colors only to flag risk | Use red or orange as decoration |
| Show real data and sample records | Use stock photos or generic AI illustrations |
| Use flat fills and thin borders | Use gradients, glows, blur or neon |
| Pair color with icon and label | Distinguish Approved and Flagged by red vs green alone |
| Use the node motif for relationships | Scatter node patterns as background decoration |

---

## 11. Design tokens (CSS)

```css
:root {
  /* Brand */
  --navy: #1E3A5F;
  --navy-hover: #16304F;
  --navy-active: #2C4E78;
  --navy-row-hover: #27446B;
  --teal: #2A9DA6;

  /* Neutrals */
  --bg: #F4F6F9;
  --surface: #FFFFFF;
  --border: #DCE3EC;
  --text: #0E1B2A;
  --text-muted: #56657A;
  --text-faint: #8A98AC;
  --divider: #EEF1F5;
  --hover: #F8FAFC;
  --soft: #E7ECF3;
  --thumb: #C4CFDC;

  /* Risk */
  --risk-rendah: #1C8C4A;      --risk-rendah-bg: #E4F4EA;   --risk-rendah-text: #146134;
  --risk-sedang: #C77A0A;      --risk-sedang-bg: #FCF1E1;   --risk-sedang-text: #8A5406;
  --risk-tinggi: #D42828;      --risk-tinggi-bg: #FBE9E9;   --risk-tinggi-text: #9B1C1C;

  /* Feedback */
  --error: #9B1C1C;

  /* Type — single family, tabular figures for data */
  --font-heading: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-mono: "Plus Jakarta Sans", system-ui, sans-serif;

  /* Shape */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-pill: 999px;
  --shadow-pop: 0 4px 16px rgba(20, 32, 46, 0.12);
}
```

---

## 12. Tailwind mapping (optional)

```js
// tailwind.config.js — values mirror the in-use palette in section 3.
// Note: tailwind.config.ts in the repo still carries older values
// (navy #24446d, risk green/yellow/red) and should be aligned separately.
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1E3A5F", hover: "#16304F", active: "#2C4E78" },
        teal: { DEFAULT: "#2A9DA6" },
        page: "#F4F6F9",
        ink: "#0E1B2A",
        risk: { rendah: "#1C8C4A", sedang: "#C77A0A", tinggi: "#D42828" },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        body: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { sm: "6px", md: "10px" },
    },
  },
};
```

---

*Note: logo hex values are sampled by eye from the logo file. If you have the original vector file, confirm the exact values with an eyedropper. The UI navy (`#1E3A5F`) is the applied brand color in code, which may differ slightly from the logo sample.*