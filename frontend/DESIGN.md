# Santa Cruz Strength Design System

## Direction

Community strength, documented honestly.

The site should feel like a well-run local training floor translated into a clear digital experience. It combines the visual authority of black iron, white walls and the existing green facility stripe with the warmth of real people training together. It is not a beach brand, an elite-only powerlifting brand or a generic wellness studio.

## Visual World

- Foundation: near-black ink, clean white, quiet warm gray and SCS green.
- Accent: one restrained red reserved for primary conversion actions and urgent states.
- Type: condensed uppercase display lettering for short statements; readable rounded sans for body and controls.
- Photography: real facility, coaching, member and event imagery. Documentary crops, natural color and no fake atmospheric effects.
- Composition: broad editorial bands, purposeful asymmetry and strong image-to-copy relationships. Avoid grids of identical cards.
- Surfaces: mostly flat. Separation comes from space, tone and rules rather than soft floating cards.
- Radius: 4 to 12px. Pills are limited to compact status labels.
- Motion: only state feedback and one restrained hero entrance. Interaction motion stays under 240ms and respects reduced motion.

## Tokens

- Ink: `#111714`
- Deep green: `#0d3f2d`
- SCS green: `#167347`
- Light green: `#dcebe1`
- Paper: `#f5f3ed`
- White: `#ffffff`
- Red action: `#c53c36`
- Muted text: `#59635e`
- Rule: `#cfd4cf`
- Maximum content width: 1180px
- Body measure: 68ch
- Spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 72, 96

## Interaction

- Every button has a clear hover, focus, active and disabled state.
- Press feedback may use `scale(0.98)` with a 140ms custom ease-out.
- Never use `transition: all`.
- Do not animate keyboard-initiated navigation.
- Mobile navigation is a semantic disclosure with a descriptive accessible name.
- Form errors appear next to the field and are announced by assistive technology.

## Responsive Behavior

- Mobile starts as one readable column with no horizontal overflow.
- Primary controls meet a 44px minimum touch target.
- Hero media keeps people and the facility mark visible rather than forcing a desktop crop.
- Tables and membership comparisons reflow without hiding terms.
- Fixed navigation must not obscure anchors or focused content.

## Explicit Rejections

- No neon, mesh or aurora gradients.
- No wave dividers or surf shorthand.
- No glassmorphism or blur used as decoration.
- No bento card collections as page structure.
- No emoji icons.
- No generic AI-generated gym scenes or synthetic member proof.
- No remote Emergent asset URLs in public surfaces.
- No audience claim based only on a Santa Cruz stereotype.
