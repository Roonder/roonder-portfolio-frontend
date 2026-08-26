---
name: Aurelian Grid v2
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#39393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#aecfaf'
  on-secondary: '#1a3620'
  secondary-container: '#335037'
  on-secondary-container: '#a0c1a2'
  tertiary: '#d0cdce'
  on-tertiary: '#303031'
  tertiary-container: '#b4b2b3'
  on-tertiary-container: '#454546'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#c9ebca'
  secondary-fixed-dim: '#aecfaf'
  on-secondary-fixed: '#04210d'
  on-secondary-fixed-variant: '#304d35'
  tertiary-fixed: '#e5e2e3'
  tertiary-fixed-dim: '#c8c6c7'
  on-tertiary-fixed: '#1b1b1c'
  on-tertiary-fixed-variant: '#474647'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 68px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 42px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 26px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  display-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 42px
    fontWeight: '600'
    lineHeight: '1.1'
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin: 40px
  container-max: 1280px
  bento-gap: 16px
---

## Brand & Style

The design system is built for high-end creative portfolios, prioritizing a "smooth minimalism" that balances surgical precision with organic warmth. The personality is sophisticated, curated, and quiet—allowing the work to take center stage while providing a luxurious frame. 

The aesthetic draws from **Bento-style grids** and **modern minimalism**, moving away from standard corporate patterns toward a bespoke, editorial feel. It utilizes deep tonal shifts, subtle high-fidelity textures (like fine grain or micro-borders), and a deliberate constraint on information density to maintain an atmosphere of exclusivity and focus.

## Colors

The palette is anchored in a deep, "obsidian" dark mode. The primary **Gold (#D4AF37)** is used sparingly for accents, highlights, and primary calls to action to signify value and prestige. The **Sage (#A2C3A4)** provides a muted, organic counterpoint to the metallic primary, used for secondary information or success states.

The background layers utilize **Neutral (#0F0F10)** as the base canvas, with **Tertiary (#1A1A1B)** defining the bento containers. This creates a low-contrast, harmonious depth that is easy on the eyes while feeling premium. Text should primarily use an off-white (#F5F5F5) to maintain high legibility without the harshness of pure white.

## Typography

This design system uses **Hanken Grotesk** across all levels to maintain a clean, contemporary rhythm. The scale is strictly governed by the **Golden Ratio (1.618)**, ensuring mathematical harmony between headers and body copy. 

For display and headlines, tighter letter-spacing and heavier weights create an impactful, editorial presence. Body text is given ample line-height to ensure breathability and ease of reading against the dark background. Labels use an all-caps treatment with increased tracking to differentiate functional UI from narrative content.

## Layout & Spacing

The layout is defined by a **strict Bento Grid model**. On desktop, the viewport is treated as a curated gallery where no more than **6 primary elements** (cards/modules) are visible simultaneously. This forces a high level of curation and prevents visual clutter.

The system uses a 12-column underlying structure for internal card content, but the top-level bento cells follow a flexible responsive grid.
- **Desktop:** A maximum of 3 columns, 2 rows visible at once.
- **Tablet:** 2 columns, vertical scrolling.
- **Mobile:** 1 column, strict vertical flow.

Spacing is based on an **8px linear scale**, with a standard 24px gutter between bento cells to create a clear "moat" around content pieces.

## Elevation & Depth

Depth is achieved through **Tonal Layering** rather than traditional shadows. 
- **Level 0 (Base):** The #0F0F10 background.
- **Level 1 (Bento Cards):** The #1A1A1B surface.
- **Level 2 (Interaction):** When hovered or active, cards utilize a subtle **inner glow** or a 1px solid stroke in the secondary Sage or Primary Gold color.

To enhance the high-fidelity feel, apply a 0.5px "glass-stroke" (white at 10% opacity) to the top and left edges of cards to simulate a physical bevel. Avoid heavy drop shadows; if a shadow is required for floating elements, use a large-radius, low-opacity (15%) shadow tinted with the primary gold.

## Shapes

The shape language is defined by **Smooth Minimalism**. All primary bento containers and buttons utilize a consistent **16px (1rem) corner radius**, providing a soft, approachable feel that contrasts with the strict grid. 

Smaller elements like tags or input fields follow an **8px (0.5rem) radius**. This "nested rounding" (where the inner radius is half the outer radius) creates a mathematically pleasing visual alignment within the grid.

## Components

### Buttons
- **Primary:** Solid Gold (#D4AF37) with dark text (#0F0F10). No border.
- **Secondary:** Transparent with a 1px Sage (#A2C3A4) border and Sage text.
- **Interaction:** On hover, buttons should subtly expand (1.02 scale) with a soft outer glow in the corresponding color.

### Bento Cards
- Each card is a container for a single piece of content (Project, About, Contact, etc.).
- Internal padding should be a minimum of 32px.
- Use "Micro-Labels" (Label-caps typography) at the top left of each card to categorize content.

### Input Fields
- Dark backgrounds (#0F0F10) with a 1px border (#1A1A1B).
- Focus state: Border changes to Gold (#D4AF37) with a subtle inner shadow.

### Navigation
- A floating "pill" dock at the bottom of the screen.
- Semi-transparent background with a heavy background blur (20px) and a 1px gold border.
- Icons should be minimal, thin-stroke (1.5px) weight.

### Custom Resources
- Use a **grain overlay** (5% opacity) across the entire UI to break the digital perfection and add a tactile, film-like quality.
- Use **Gold-tinted gradients** for image overlays to ensure brand consistency across various project types.