{
  "brand": {
    "name": "Santa Cruz Strength",
    "attributes": [
      "serious",
      "authentic",
      "local-coastal",
      "modern-but-grounded",
      "high-converting",
      "performance-first",
      "community-strength"
    ],
    "anti_attributes": [
      "corporate",
      "luxury-spa",
      "crossfit-cliche",
      "bro-gym-intimidation",
      "cluttered",
      "heavy-animations"
    ]
  },
  "inspiration_refs": {
    "notes": "Use culture-first messaging and strong identity-driven layouts; keep motion subtle for Lighthouse mobile.",
    "sources": [
      {
        "type": "article",
        "url": "https://nanoglobals.com/gym-websites/",
        "why": "Examples of culture-first gym positioning + dual CTA patterns"
      },
      {
        "type": "article",
        "url": "https://www.advertaimarketing.com/post/what-makes-a-fitness-website-convert-in-2026-not-just-look-good",
        "why": "Conversion patterns: repeated CTAs, above-the-fold clarity"
      },
      {
        "type": "article",
        "url": "https://wod.guru/blog/gym-website-design/",
        "why": "2026 gym web patterns; video guidance (use sparingly / optimized)"
      },
      {
        "type": "doc",
        "url": "https://ui.shadcn.com/docs/components/table",
        "why": "CRM table primitives; consistent accessibility"
      },
      {
        "type": "doc",
        "url": "https://ui.shadcn.com/docs/components/accordion",
        "why": "FAQ accordion behaviors"
      }
    ]
  },
  "design_direction": {
    "style_fusion": {
      "layout": "Editorial + Bento grid (marketing) with F-pattern conversion flow; CRM uses dense dark-mode data table",
      "surface": "Charcoal solids + subtle noise texture; thin red accent lines; occasional coastal steel/sea tint for secondary accents",
      "type": "Condensed, high-impact headlines + neutral readable body",
      "imagery": "High-contrast gym photography + restrained coastal detail shots (ocean/cliffs) as separators"
    },
    "mobile_first_rules": [
      "Thumb-first CTAs: primary buttons full width on mobile; sticky bottom CTA only on Home + Join (optional)",
      "Short, scannable sections: 1 idea per viewport; use Accordion for extra detail",
      "Avoid heavy parallax/video; if any motion, use small translate/opacity and respect prefers-reduced-motion"
    ]
  },
  "typography": {
    "google_fonts": {
      "headings": {
        "family": "Bebas Neue",
        "fallback": "Impact, system-ui",
        "usage": "H1/H2/H3 + section labels; ALL CAPS optional; +2 to +4 tracking"
      },
      "body": {
        "family": "Inter",
        "fallback": "system-ui, -apple-system, Segoe UI, Roboto",
        "usage": "paragraphs, forms, nav, CRM UI"
      },
      "mono_accent_optional": {
        "family": "IBM Plex Mono",
        "usage": "stats, small labels, lead IDs; keep minimal"
      }
    },
    "scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2_supporting": "text-base md:text-lg",
      "section_h2": "text-3xl sm:text-4xl",
      "h3": "text-xl sm:text-2xl",
      "body": "text-sm sm:text-base",
      "small": "text-xs sm:text-sm"
    },
    "typesetting_rules": [
      "Headlines: tight leading (leading-[0.95] to leading-[1.05]), slight tracking-wide",
      "Body: leading-relaxed; max-w-prose on reading blocks",
      "Avoid centered paragraph blocks; left-align for natural reading"
    ]
  },
  "color_system": {
    "palette": {
      "ink": "#0A0A0A",
      "charcoal": "#1A1A1A",
      "elevated": "#111214",
      "text": "#FFFFFF",
      "text_muted": "#F5F5F5",
      "muted_2": "#CFCFCF",
      "border": "#2A2A2A",
      "cta_red": "#D32F2F",
      "cta_red_hover": "#B71C1C",
      "success": "#2E7D32",
      "warning": "#F59E0B",
      "info_coastal": "#6EA8B7",
      "focus_ring": "#F5F5F5"
    },
    "semantic_tokens_hsl_for_shadcn": {
      "notes": "Set these in index.css :root and .dark. Marketing pages default to dark theme; CRM uses dark theme with slightly higher contrast borders.",
      "root_dark_recommendation": {
        "--background": "0 0% 4%",
        "--foreground": "0 0% 98%",
        "--card": "0 0% 7%",
        "--card-foreground": "0 0% 98%",
        "--popover": "0 0% 7%",
        "--popover-foreground": "0 0% 98%",
        "--primary": "0 0% 98%",
        "--primary-foreground": "0 0% 9%",
        "--secondary": "0 0% 12%",
        "--secondary-foreground": "0 0% 98%",
        "--muted": "0 0% 12%",
        "--muted-foreground": "0 0% 70%",
        "--accent": "0 0% 12%",
        "--accent-foreground": "0 0% 98%",
        "--destructive": "0 72% 45%",
        "--destructive-foreground": "0 0% 98%",
        "--border": "0 0% 16%",
        "--input": "0 0% 16%",
        "--ring": "0 0% 92%",
        "--radius": "0.75rem",
        "--scs-red": "0 72% 51%",
        "--scs-coastal": "192 28% 58%"
      }
    },
    "gradients": {
      "rule": "No saturated/dark multi-color gradients; use only mild charcoal-to-ink with subtle coastal tint as decorative background; keep under 20% viewport.",
      "allowed": [
        {
          "name": "hero_sheen",
          "css": "radial-gradient(900px circle at 10% 0%, rgba(110,168,183,0.14), transparent 55%), radial-gradient(700px circle at 90% 10%, rgba(211,47,47,0.10), transparent 52%)",
          "usage": "Hero background overlay only (decorative, behind content)"
        },
        {
          "name": "section_wash",
          "css": "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 65%)",
          "usage": "Top edge fade for section separation"
        }
      ]
    },
    "contrast_notes": [
      "All red CTA text should be white (#fff).",
      "Muted body text should be at least #CFCFCF on #0A0A0A."
    ]
  },
  "design_tokens": {
    "css_custom_properties": {
      "spacing": {
        "--space-1": "0.25rem",
        "--space-2": "0.5rem",
        "--space-3": "0.75rem",
        "--space-4": "1rem",
        "--space-5": "1.25rem",
        "--space-6": "1.5rem",
        "--space-8": "2rem",
        "--space-10": "2.5rem",
        "--space-12": "3rem",
        "--space-16": "4rem"
      },
      "radius": {
        "--radius-sm": "0.5rem",
        "--radius-md": "0.75rem",
        "--radius-lg": "1rem"
      },
      "shadow": {
        "--shadow-soft": "0 12px 30px rgba(0,0,0,0.35)",
        "--shadow-card": "0 10px 24px rgba(0,0,0,0.45)",
        "--shadow-inset": "inset 0 1px 0 rgba(255,255,255,0.06)"
      },
      "stroke": {
        "--stroke-1": "1px solid rgba(255,255,255,0.10)",
        "--stroke-2": "1px solid rgba(255,255,255,0.14)"
      },
      "motion": {
        "--ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "--dur-1": "120ms",
        "--dur-2": "180ms",
        "--dur-3": "240ms"
      }
    }
  },
  "layout": {
    "grid": {
      "container": "max-w-6xl mx-auto px-4 sm:px-6",
      "section_spacing": "py-14 sm:py-20",
      "bento": "grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6",
      "two_col_cta": "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
    },
    "navigation": {
      "pattern": "Sticky top nav on public pages; CRM uses left sidebar (Sheet/Resizable for desktop) + top search",
      "mobile": "Hamburger opens Sheet; keep Join Now as a persistent button in nav"
    }
  },
  "components": {
    "component_path": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "accordion": "/app/frontend/src/components/ui/accordion.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "dropdown": "/app/frontend/src/components/ui/dropdown-menu.jsx",
      "sonner": "/app/frontend/src/components/ui/sonner.jsx"
    },
    "marketing_page_sections": {
      "hero": {
        "layout": "Split stack on mobile: headline -> proof chips -> inline form -> dual CTA. On desktop: left content, right media card.",
        "shadcn": ["Card", "Button", "Input", "Label"],
        "cta": [
          {
            "label": "Join Now",
            "type": "external",
            "href": "https://onlinejoin.abcfitness.com/signup/plan?club=31691",
            "variant": "scsPrimary"
          },
          {
            "label": "Book a Visit",
            "type": "scroll",
            "target": "#lead-form",
            "variant": "scsSecondary"
          }
        ],
        "data_testids": [
          "home-hero-join-now-button",
          "home-hero-book-visit-button",
          "home-hero-inline-form-name-input",
          "home-hero-inline-form-phone-input",
          "home-hero-inline-form-submit-button"
        ],
        "micro_interactions": [
          "Primary CTA hover: background shifts from cta_red to cta_red_hover; slight translateY(-1px)",
          "Form submit: show sonner toast + button loading state"
        ]
      },
      "benefits_bento": {
        "layout": "Bento grid 1x4 (mobile) -> 12-col (desktop) with 2 large + 2 small cards.",
        "cards": [
          "Coaching that respects your life",
          "Real strength equipment",
          "Small-group atmosphere",
          "Santa Cruz community"
        ],
        "shadcn": ["Card", "Badge"],
        "data_testids": ["home-benefits-section"]
      },
      "training_experience": {
        "layout": "Editorial: image left (or top on mobile) + copy right with bullet list.",
        "shadcn": ["Separator", "Badge"],
        "data_testids": ["home-training-experience-section"]
      },
      "who_its_for": {
        "layout": "Chips/tags + short descriptions; avoid stereotypes; include surfers/climbers/cyclists/runners/powerlifters.",
        "shadcn": ["Badge", "Card"],
        "data_testids": ["home-who-its-for-section"]
      },
      "testimonials": {
        "layout": "3-up cards on desktop, horizontal scroll snap on mobile.",
        "shadcn": ["Card", "Avatar"],
        "data_testids": ["home-testimonials-section"]
      },
      "faq": {
        "layout": "Accordion; keep questions short; one open at a time.",
        "shadcn": ["Accordion"],
        "data_testids": ["home-faq-accordion"]
      },
      "local_map": {
        "layout": "Two-column: map embed + contact/hours card. On mobile: contact card first, then map.",
        "address": "151 Harvey West Blvd Ste D, Santa Cruz, CA 95060",
        "phone": "(408) 337-6709",
        "shadcn": ["Card", "Button"],
        "data_testids": [
          "contact-click-to-call-button",
          "contact-address-block",
          "contact-hours-block",
          "contact-map-embed"
        ]
      },
      "final_cta": {
        "layout": "Short, punchy, high-contrast; repeat dual CTA; include trust line.",
        "shadcn": ["Button"],
        "data_testids": ["home-final-cta-join-now-button", "home-final-cta-book-visit-button"]
      }
    },
    "crm": {
      "theme": "dark, dense, clean; prioritize scanability",
      "login": {
        "layout": "Centered card but page background stays left-aligned overall; minimal fields.",
        "shadcn": ["Card", "Input", "Button"],
        "data_testids": [
          "staff-login-email-input",
          "staff-login-password-input",
          "staff-login-submit-button"
        ]
      },
      "dashboard": {
        "layout": "Top KPI row (4 cards) -> filters/search row -> leads table. Mobile: KPI carousel + table becomes horizontal scroll with sticky first column.",
        "shadcn": ["Card", "Table", "Badge", "Input", "Select", "Tabs", "DropdownMenu"],
        "kpis": ["New (7d)", "Contacted", "Booked", "Joined"],
        "table_columns": [
          "Name",
          "Phone",
          "Status",
          "Last Activity",
          "Source",
          "Owner",
          "Actions"
        ],
        "data_testids": [
          "crm-dashboard-search-input",
          "crm-dashboard-status-filter-select",
          "crm-dashboard-leads-table",
          "crm-dashboard-kpi-new",
          "crm-dashboard-kpi-booked"
        ]
      },
      "lead_detail": {
        "layout": "Two-column on desktop: profile card + status/next actions (left) and activity/notes (right). Mobile: tabs (Profile, Activity, Notes).",
        "shadcn": ["Card", "Tabs", "Select", "Textarea", "Button", "Separator"],
        "data_testids": [
          "crm-lead-detail-status-select",
          "crm-lead-detail-add-note-textarea",
          "crm-lead-detail-add-note-submit-button",
          "crm-lead-detail-activity-timeline"
        ]
      },
      "settings": {
        "layout": "Simple form sections; danger zone dialog for delete user.",
        "shadcn": ["Card", "Input", "Button", "Dialog"],
        "data_testids": ["crm-settings-update-profile-button", "crm-settings-delete-account-button"]
      }
    },
    "component_styles_tailwind": {
      "buttons": {
        "primary": "bg-[var(--scs-cta)] text-white hover:bg-[var(--scs-cta-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--scs-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "secondary": "bg-white/0 text-white border border-white/15 hover:border-white/30 hover:bg-white/5",
        "ghost": "bg-transparent text-white/80 hover:text-white hover:bg-white/5"
      },
      "cards": {
        "marketing": "bg-white/5 border border-white/10 rounded-[var(--radius-md)] shadow-[var(--shadow-card)]",
        "crm": "bg-white/4 border border-white/12 rounded-[var(--radius-md)]"
      },
      "inputs": {
        "base": "bg-black/40 border border-white/12 text-white placeholder:text-white/45 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      },
      "badges": {
        "status_new": "bg-white/10 text-white border border-white/10",
        "status_contacted": "bg-[rgba(110,168,183,0.18)] text-[#BFE2EA] border border-[rgba(110,168,183,0.22)]",
        "status_booked": "bg-[rgba(211,47,47,0.18)] text-[#FFD4D4] border border-[rgba(211,47,47,0.22)]",
        "status_joined": "bg-[rgba(46,125,50,0.18)] text-[#CFEBD1] border border-[rgba(46,125,50,0.22)]"
      }
    }
  },
  "motion": {
    "library": {
      "recommendation": "framer-motion (optional); keep to 2-3 small patterns; ensure prefers-reduced-motion fallback",
      "install": "npm i framer-motion"
    },
    "principles": [
      "Use opacity + small translateY (4-8px) for entrance; never large parallax",
      "Hover: button press scale 0.98 on active only; avoid constant looping",
      "Scroll: optional reveal for section headings only"
    ],
    "tailwind_patterns": {
      "interactive": "transition-colors duration-200",
      "card_hover": "transition-colors duration-200 hover:bg-white/7",
      "cta_press": "active:scale-[0.98]"
    }
  },
  "imagery": {
    "image_urls": [
      {
        "category": "hero_gym",
        "description": "Moody barbell/strength shot for hero media card (use as background with dark overlay for readability)",
        "url": "https://images.unsplash.com/photo-1709315957145-a4bad1feef28?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "hero_gym_alt",
        "description": "Secondary strength image for PT page header",
        "url": "https://images.unsplash.com/photo-1656774950529-44a6153521ee?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "divider_coast",
        "description": "Coastal separator image (use small, letterboxed, low height; or blurred background behind section title)",
        "url": "https://images.unsplash.com/photo-1498846584460-010c2a65aa7d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "divider_coast_alt",
        "description": "Alternate coastal image for Contact/Local section background accent",
        "url": "https://images.unsplash.com/photo-1553704541-2a5a7d64d6c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ],
    "usage_rules": [
      "Avoid generic smiling stock fitness imagery; prefer equipment + training moments.",
      "Always apply dark overlay: bg-black/60 to bg-black/75 for text readability.",
      "Prefer next-gen formats if available later (webp/avif) and set width params."
    ]
  },
  "forms_and_validation": {
    "lead_forms": {
      "fields": ["name", "phone", "email", "goals"],
      "pattern": "One-column on mobile; labels above inputs; inline helper text; show errors under field.",
      "success": "On submit: sonner toast + redirect to Thank You page.",
      "data_testids": [
        "lead-form-name-input",
        "lead-form-phone-input",
        "lead-form-email-input",
        "lead-form-goals-textarea",
        "lead-form-submit-button",
        "lead-form-error-message"
      ]
    }
  },
  "accessibility": {
    "wcag": "AA",
    "requirements": [
      "Visible focus rings on all interactive elements",
      "Don’t rely on color alone for status; pair badge color with text label",
      "Tap targets: min-h-[44px] for buttons/inputs",
      "Use aria-label for icon-only buttons",
      "Support prefers-reduced-motion: disable entrance animations"
    ]
  },
  "performance": {
    "rules": [
      "Avoid autoplay video on mobile. If using any video, use poster + manual play.",
      "Lazy-load below-the-fold images and map embed.",
      "Keep shadows subtle and avoid heavy blur filters across large areas.",
      "Use system fonts until Google Fonts load (font-display: swap)."
    ]
  },
  "data_testid_conventions": {
    "format": "kebab-case role-based",
    "examples": [
      "home-hero-join-now-button",
      "join-page-lead-form-submit-button",
      "crm-dashboard-leads-table",
      "crm-lead-detail-status-select"
    ]
  },
  "instructions_to_main_agent": [
    "Update /app/frontend/src/App.css to remove centered App-header demo styling; do NOT center-align the app container.",
    "Set global theme tokens in /app/frontend/src/index.css: make dark theme default for marketing by applying `class=dark` at root (or set :root dark values). Keep CRM also dark but with denser table spacing.",
    "Add Google Fonts (Bebas Neue + Inter) in public/index.html and set font-family via Tailwind base layer.",
    "Build reusable sections as React .js components: Hero, BentoBenefits, TestimonialsCarousel, FAQAccordion, LocalSection.",
    "All CTAs and form elements must include data-testid attributes per this guideline.",
    "Use shadcn/ui primitives only for Accordion/Select/Dropdown/Sheet/Dialog/Table; do not use raw HTML dropdowns/calendars.",
    "Keep gradients decorative and under 20% viewport; prefer solid charcoal backgrounds for readability.",
    "CRM: implement filters/search with shadcn Input + Select; status as Badge; row actions as DropdownMenu; lead detail uses Tabs on mobile.",
    "Use sonner for form submission confirmations and CRM actions (status change, note added)."
  ]
}


<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
