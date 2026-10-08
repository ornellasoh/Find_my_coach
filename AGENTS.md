# Apple Design Skill & Human Interface Guidelines (HIG) Standard

This repository follows Apple Human Interface Guidelines (HIG) standards and design principles for UI/UX craftsmanship across mobile and web interfaces.

## 1. Core Principles
- **Clarity**: Text is crisp and legible across sizes, iconography is clear and purposeful, and layouts prioritize content over unnecessary ornamentation.
- **Deference**: The interface elevates and respects the content. Fluid transitions, subtle materials, and native elevation cues guide the user without visual noise.
- **Depth**: Subtle layering, backdrop blur (`backdrop-blur-md` / materials), and fluid motion convey hierarchy and spatial awareness.

## 2. Layout, Sizing & Touch Targets
- **Minimum Touch Targets**: All interactive elements maintain at least 44x44pt hit targets.
- **Spatial Grid**: Rhythmic 8pt / 4pt grid system with consistent margins and generous negative space.
- **Corner Radii & Mathematical Nesting**: Inner corner radius equals `Outer Radius - Padding`. Use continuous, organic curves (squircle feel, `rounded-2xl` to `rounded-3xl` for cards, `rounded-full` for chips/pills).
- **Safe Areas & Modals**: Respect top/bottom safe areas, bottom sheet grabber indicators, and sticky contextual action bars.

## 3. Typography & Hierarchy
- **Scale**: Strict typographical hierarchy with clear step ratios (Title 1, Title 2, Headline, Subheadline, Body, Callout, Footnote, Caption).
- **Numerics**: Tabular figures for prices, ratings, counts, and countdown timers.
- **Readability**: Avoid wrapping single words in badges, buttons, or chips. Use tight, scannable line heights (1.4–1.6).

## 4. Materials, Color & Vibrancy
- **Neutral Palette**: Clean background groupings (`#F6F9FA` / `#F2F2F7` system background, `#FFFFFF` secondary container cards, refined 1px borders with `#E2E8F0` / `rgba(0,0,0,0.06)`).
- **Vibrant Accents**: High-contrast, intentional accent colors (Apple-grade Emerald Green `#00D664` / `#00B050`, Slate `#0F172A`, Amber `#F59E0B`).
- **Materials**: Translucent frosted headers, blur navigation bars (`bg-white/90 backdrop-blur-md`), and clean drop shadows (`shadow-xs` / `shadow-sm`).

## 5. Motion & Feedback
- **Micro-Interactions**: Fluid spring animations for button presses (`active:scale-98`), sheet entrances, and route transitions using `motion/react`.
- **States**: Immediate visual state feedback on hover, focus-visible, and active interactions.
