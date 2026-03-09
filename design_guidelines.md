{
  "brand_summary": {
    "project": "Santa Cruz Strength — Marketing Site Light Redesign",
    "positioning": "Coastal Santa Cruz meets serious strength training. Light, airy, sun-washed surfaces with grounded forest-green structure and coral punch.",
    "voice": {
      "tone": ["conversational", "witty", "genuine", "confident"],
      "microcopy_examples": [
        "Oh, you like lifting? Well, lifting likes you too.",
        "Strong for the coast. Ready for anything.",
        "Pick a goal. We’ll handle the plan."
      ]
    },
    "non_negotiables": [
      "Do NOT touch backend/CRM/staff pages (keep existing dark theme).",
      "Keep Bebas Neue for hero display only.",
      "Use Nunito or Poppins for everything else.",
      "Mobile-first responsiveness across all marketing pages.",
      "All interactive and key informational elements MUST include data-testid (kebab-case)."
    ]
  },
  "design_personality": {
    "keywords": ["airy", "coastal", "premium-approachable", "serious-strength", "playful-authentic"],
    "style_fusion": {
      "layout_principle": "Editorial / magazine rhythm (strong typographic hierarchy + asymmetric content blocks)",
      "shape_language": "Soft curves, large radii (20–28px), organic wave dividers between sections",
      "ui_system": "Shadcn-first components with custom tokens and coastal surfaces"
    },
    "inspiration_notes": {
      "borrow_from_humble_sea": [
        "Conversational CTAs and playful headings; authentic local vibe",
        "Big, confident section headers with simple, direct CTA buttons",
        "Content blocks separated clearly; list sections feel like ‘stories’ rather than generic feature dumps"
      ],
      "borrow_from_stepper_best_practices": [
        "Always show where you are + what’s next (step count + labels).",
        "Keep each step lightweight (1 decision per step when possible).",
        "Bottom-anchored navigation on mobile for thumb reach.",
        "Inline validation and clear back/next affordances.",
        "Add subtle completion indicators (checkmarks) to reduce uncertainty."
      ],
      "sources": {
        "humblesea": "https://humblesea.com/",
        "stepper_ui_reference": "https://www.eleken.co/blog-posts/stepper-ui-examples",
        "dribbble_ocean_web": "https://dribbble.com/search/ocean%20website"
      }
    }
  },
  "typography": {
    "google_fonts": {
      "display": {
        "family": "Bebas Neue",
        "use_for": ["Hero H1 only", "very large numeric/short punch headings"],
        "css": "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');"
      },
      "primary": {
        "family": "Nunito",
        "fallback": "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        "weights": [400, 500, 600, 700, 800],
        "css": "@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');"
      }
    },
    "utility_classes": {
      "display_class": "font-display",
      "body_class": "font-body"
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-sm md:text-base",
      "small": "text-xs md:text-sm"
    },
    "rules": [
      "Avoid center-aligned long paragraphs; keep reading flow left-aligned.",
      "Use tighter letter spacing for Bebas headings (tracking-tight) and normal tracking for Nunito.",
      "Keep hero H1 short (6–10 words)."
    ]
  },
  "color_system": {
    "provided_palette": {
      "primary": "#0D5D3E",
      "secondary": "#CDEAE0",
      "accent_coral": "#FA5A5C",
      "charcoal": "#1C1C1C",
      "neutral": "#F7F5F0",
      "white": "#FFFFFF"
    },
    "semantic_tokens": {
      "background": "#F7F5F0",
      "surface": "#FFFFFF",
      "surfaceMuted": "#CDEAE0",
      "text": "#1C1C1C",
      "textMuted": "#475569",
      "primary": "#0D5D3E",
      "primaryHover": "#0B5136",
      "accent": "#FA5A5C",
      "accentHover": "#E94B4D",
      "border": "rgba(13,93,62,0.14)",
      "ring": "rgba(13,93,62,0.45)",
      "success": "#0D5D3E",
      "warning": "#B45309",
      "danger": "#B91C1C",
      "focus": "rgba(250,90,92,0.35)"
    },
    "gradients_texture": {
      "allowed_gradients": [
        {
          "name": "coastal-mist (hero-only, decorative)",
          "css": "linear-gradient(135deg, rgba(205,234,224,0.85) 0%, rgba(247,245,240,0.95) 55%, rgba(255,255,255,0.95) 100%)",
          "usage": "Hero background overlay; keep under 20% of viewport height (top band / behind hero content)."
        },
        {
          "name": "seafoam-wash (section edge)",
          "css": "linear-gradient(180deg, rgba(205,234,224,0.8) 0%, rgba(247,245,240,1) 70%)",
          "usage": "Top/bottom decorative section fades (not behind dense text)."
        }
      ],
      "noise_overlay": {
        "css_snippet": ".noise-overlay{position:absolute;inset:0;pointer-events:none;opacity:.06;background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.4%22/%3E%3C/svg%3E');}",
        "usage": "Apply only to large background wrappers (hero, section backgrounds). Do not place on cards or text blocks."
      }
    }
  },
  "design_tokens_css": {
    "file_targets": ["/app/frontend/src/index.css", "/app/frontend/src/App.css"],
    "instructions": [
      "Marketing pages should use the new LIGHT tokens; CRM/staff pages should keep current dark styles. Implement by scoping with a body class like .theme-marketing-light on marketing routes, leaving existing :root tokens intact for CRM.",
      "Do NOT set text-align:center on .App.",
      "Replace #root background in App.css from #0A0A0A to neutral background token for marketing routes only."
    ],
    "css_variables_scoped": "/* Add to index.css */\n.theme-marketing-light{\n  --background: 40 33% 95%; /* ~#F7F5F0 */\n  --foreground: 0 0% 11%; /* ~#1C1C1C */\n  --card: 0 0% 100%;\n  --card-foreground: 0 0% 11%;\n  --popover: 0 0% 100%;\n  --popover-foreground: 0 0% 11%;\n  --primary: 155 76% 21%; /* #0D5D3E */\n  --primary-foreground: 0 0% 100%;\n  --secondary: 165 45% 86%; /* #CDEAE0 */\n  --secondary-foreground: 0 0% 11%;\n  --muted: 40 33% 95%;\n  --muted-foreground: 215 16% 35%;\n  --accent: 2 94% 66%; /* #FA5A5C */\n  --accent-foreground: 0 0% 100%;\n  --destructive: 0 70% 45%;\n  --destructive-foreground: 0 0% 100%;\n  --border: 155 35% 84%;\n  --input: 155 30% 86%;\n  --ring: 155 76% 21%;\n  --radius: 1.5rem; /* 24px target */\n  --shadow-soft: 0 10px 30px rgba(13,93,62,0.10);\n  --shadow-card: 0 12px 26px rgba(17,24,39,0.08);\n}\n\n.font-display{font-family:'Bebas Neue',Impact,system-ui;}\n.font-body{font-family:'Nunito',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}\n",
    "tailwind_notes": [
      "Prefer Tailwind utilities for layout; reserve custom CSS for wave dividers/noise overlays/tokens.",
      "Use rounded-[24px] frequently; smaller inner controls rounded-xl (12px) for contrast."
    ]
  },
  "layout_grid": {
    "page_container": "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
    "section_spacing": "py-14 sm:py-18 lg:py-24",
    "stack_spacing": "space-y-6 sm:space-y-8",
    "card_radius": "rounded-[24px]",
    "editorial_columns": {
      "two_col": "grid gap-8 lg:grid-cols-[1.05fr_0.95fr]",
      "reverse_two_col": "grid gap-8 lg:grid-cols-[0.95fr_1.05fr]"
    },
    "patterns": [
      "Use asymmetric editorial blocks: left text + right image collage (or vice versa) with subtle overlap (translate-y-2) on desktop.",
      "Use wave dividers between major sections instead of hard straight separators.",
      "Keep cards on white; keep reading areas on neutral (#F7F5F0) with generous padding."
    ]
  },
  "components": {
    "shadcn_paths": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "accordion": "/app/frontend/src/components/ui/accordion.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "radio_group": "/app/frontend/src/components/ui/radio-group.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "navigation_menu": "/app/frontend/src/components/ui/navigation-menu.jsx",
      "carousel": "/app/frontend/src/components/ui/carousel.jsx",
      "sonner_toast": "/app/frontend/src/components/ui/sonner.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx"
    },
    "navbar": {
      "structure": "Sticky light nav with subtle blur (glass-lite), left logo, center links (desktop), right CTA button.",
      "tailwind": "sticky top-0 z-50 bg-[rgba(247,245,240,0.82)] backdrop-blur-md border-b border-[rgba(13,93,62,0.12)]",
      "mobile": "Use Sheet for hamburger menu; CTA stays visible as small button.",
      "data_testids": {
        "nav": "marketing-navbar",
        "mobile_menu_open": "marketing-navbar-mobile-open-button",
        "primary_cta": "marketing-navbar-primary-cta-button"
      }
    },
    "buttons": {
      "variants": {
        "primary": {
          "style": "Solid green button with white text; hover flips to coral; active press scale.",
          "tailwind": "bg-[#0D5D3E] text-white hover:bg-[#FA5A5C] active:scale-[0.98] transition-colors duration-200",
          "radius": "rounded-xl",
          "focus": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,93,62,0.35)]"
        },
        "secondary": {
          "style": "Outlined green; hover adds seafoam fill.",
          "tailwind": "border border-[rgba(13,93,62,0.35)] text-[#0D5D3E] bg-transparent hover:bg-[#CDEAE0] transition-colors duration-200",
          "radius": "rounded-xl"
        },
        "ghost": {
          "style": "Text button for subtle actions.",
          "tailwind": "text-[#0D5D3E] hover:bg-[rgba(13,93,62,0.08)] transition-colors duration-200 rounded-lg"
        }
      },
      "sizing": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-11 px-5 text-sm",
        "lg": "h-12 px-6 text-base"
      },
      "rule": "No transition: all. Only transition-colors, shadow, opacity (avoid transform transitions globally)."
    },
    "cards": {
      "benefit_card": {
        "tailwind": "rounded-[24px] bg-white border border-[rgba(13,93,62,0.12)] shadow-[var(--shadow-card)] p-6",
        "hover": "hover:shadow-[0_16px_34px_rgba(17,24,39,0.10)] hover:-translate-y-0.5 transition-[box-shadow] duration-200",
        "note": "Do not animate transform by default on all cards; only on specific interactive cards."
      },
      "testimonial_card": {
        "tailwind": "rounded-[24px] bg-white p-6 border border-[rgba(13,93,62,0.10)]",
        "accent": "Add small coral quote mark icon (lucide) in top-left as brand punctuation."
      }
    },
    "wave_dividers": {
      "implementation": [
        "Use an SVG wave divider component between sections.",
        "Wave color should be seafoam (#CDEAE0) or neutral (#F7F5F0), never dark gradients.",
        "Keep it subtle: height 36–64px on mobile, 72–110px on desktop."
      ],
      "svg_example": "<svg viewBox=\"0 0 1440 120\" preserveAspectRatio=\"none\" className=\"w-full h-16 sm:h-20\">\n  <path d=\"M0,64 C240,96 480,32 720,64 C960,96 1200,32 1440,64 L1440,120 L0,120 Z\" fill=\"#CDEAE0\"/>\n</svg>"
    }
  },
  "page_blueprints": {
    "home": {
      "hero": {
        "layout": "Split hero: Left = big Bebas headline + witty subhead + trust chips. Right = quiz card (5-step).",
        "background": "Neutral base with a thin coastal-mist gradient band + optional noise overlay.",
        "elements": [
          "H1 (Bebas): ‘STRENGTH FOR LIFE ON THE COAST’",
          "Subhead (Nunito): short, conversational promise",
          "Trust row: ‘Coach-led’, ‘Beginner-friendly’, ‘Serious programming’ (Badge components)",
          "Primary CTA: ‘Take the 60‑second quiz’ scrolls to quiz card"
        ],
        "data_testids": {
          "hero": "home-hero",
          "hero_primary_cta": "home-hero-primary-cta-button"
        }
      },
      "quiz_lead_capture": {
        "component_strategy": "Card + Progress + RadioGroup/ToggleGroup + Button. Use Dialog on mobile for full-screen wizard feel.",
        "steps": [
          {
            "step": 1,
            "question": "What brings you in?",
            "options": ["Get stronger", "Move better", "Get back at it", "Train for sport"],
            "ui": "ToggleGroup or RadioGroup buttons"
          },
          {
            "step": 2,
            "question": "What’s your training vibe right now?",
            "options": ["New-ish", "Consistent", "Off & on", "Experienced"],
            "ui": "RadioGroup"
          },
          {
            "step": 3,
            "question": "How many days/week feels realistic?",
            "options": ["2", "3", "4", "5+"],
            "ui": "Button pills"
          },
          {
            "step": 4,
            "question": "Any focus area?",
            "options": ["Strength", "Hypertrophy", "Conditioning", "Injury-resilient"],
            "ui": "Checkbox (multi-select)"
          },
          {
            "step": 5,
            "question": "Where should we send your plan?",
            "fields": ["name", "email", "phone"],
            "ui": "Input + inline validation"
          }
        ],
        "interaction_rules": [
          "Auto-advance on selection for steps 1–3 (with 250ms delay so feedback is perceived).",
          "Show ‘Step X of 5’ + progress bar (shadcn Progress).",
          "Back button always visible (except step 1).",
          "On step 5, disable submit until valid; show helper text ‘No spam. Just programming.’",
          "On submit: show Sonner toast + route to Thank You page."
        ],
        "tailwind_shell": "rounded-[28px] bg-white border border-[rgba(13,93,62,0.14)] shadow-[var(--shadow-soft)] p-5 sm:p-6",
        "data_testids": {
          "quiz": "lead-quiz",
          "quiz_next": "lead-quiz-next-button",
          "quiz_back": "lead-quiz-back-button",
          "quiz_submit": "lead-quiz-submit-button",
          "quiz_progress": "lead-quiz-progress"
        }
      },
      "benefits": {
        "layout": "3-up bento cards (mobile: 1 column).",
        "components": ["Card", "Badge"],
        "content_angle": "Coastal lifestyle outcomes (surf stronger, climb longer) paired with serious training proof (progressions, coaching)."
      },
      "training_experience": {
        "layout": "Editorial: big pull-quote + image + numbered mini-sections.",
        "components": ["Separator", "Badge"],
        "micro_interaction": "On scroll-in, each numbered item fades up (Framer Motion optional)."
      },
      "testimonials": {
        "layout": "Card grid; optional Carousel on mobile.",
        "components": ["Card", "Carousel"],
        "data_testids": {
          "testimonials": "home-testimonials"
        }
      },
      "faq": {
        "components": ["Accordion"],
        "style": "White accordion cards on neutral background; rounded-xl triggers; subtle border.",
        "data_testids": {
          "faq": "home-faq"
        }
      },
      "contact_map": {
        "layout": "2-col: left contact card, right map embed with rounded mask.",
        "components": ["Card", "Button", "Input", "Textarea"],
        "map_style": "rounded-[24px] overflow-hidden border border-[rgba(13,93,62,0.12)]"
      }
    },
    "join_membership": {
      "layout": "Pricing-like cards (not corporate). Emphasize ‘Start here’ plan.",
      "components": ["Card", "Tabs", "Button", "Badge"],
      "cta": "Primary: ‘Book a consult’ (coral hover)."
    },
    "personal_training": {
      "layout": "Longform editorial with ‘Coach philosophy’ + ‘How sessions work’ step cards.",
      "components": ["Card", "Accordion"],
      "add_on": "Optional lightweight Recharts (progress examples) in a ‘What progress looks like’ section."
    },
    "blog_listing": {
      "layout": "Grid cards with tags; featured post as wide editorial card.",
      "components": ["Card", "Badge", "Pagination"],
      "data_testids": {
        "blog_list": "blog-list"
      }
    },
    "blog_post": {
      "layout": "Readable article: max-w-3xl; generous line-height; pull-quote blocks.",
      "typography": "Prose-like classes; avoid dark reading backgrounds.",
      "components": ["Separator", "Badge"],
      "data_testids": {
        "blog_post": "blog-post"
      }
    },
    "thank_you": {
      "layout": "Centered-ish card but left-aligned text; show next steps and calendar booking CTA.",
      "components": ["Card", "Button"],
      "data_testids": {
        "thank_you": "thank-you"
      }
    }
  },
  "motion_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage": [
        "Section reveal: fadeInUp with stagger on benefit cards.",
        "Quiz step transitions: crossfade + slight y shift.",
        "Navbar: on scroll, add shadow + reduce padding (but keep readable)."
      ]
    },
    "principles": [
      "Motion should feel like ‘ocean breeze’: short, soft, and directional (y: 8–14px).",
      "Use transitions on color/opacity/shadow; avoid layout jank.",
      "Respect prefers-reduced-motion (disable non-essential animation)."
    ],
    "hover_states": [
      "Primary buttons: color swap to coral.",
      "Cards: shadow lift only (avoid constant translateY on all cards).",
      "Links: underline offset animation via background-size transition (not transform)."
    ]
  },
  "accessibility": {
    "contrast": [
      "Charcoal text (#1C1C1C) on neutral/white backgrounds for readable longform.",
      "Coral buttons must use white text; ensure hover retains AA contrast."
    ],
    "focus": [
      "Use visible focus ring: ring-2 ring-[rgba(13,93,62,0.35)] or coral focus for destructive actions.",
      "Do not remove outlines without replacement."
    ],
    "touch_targets": ["Minimum 44px height for tap targets", "Quiz options must be full-width on mobile"],
    "forms": [
      "Inline errors must be text + icon (not color-only).",
      "Associate labels with inputs (shadcn Label)."
    ]
  },
  "images": {
    "note": "Primary gym photography already exists; lighten overlays instead of swapping images. Use the URLs below only for optional marketing fillers (blog hero, coastal texture moments).",
    "image_urls": [
      {
        "category": "coastal-hero-background",
        "description": "Warm sunrise over water for subtle hero/background or blog header (use light overlay for text).",
        "url": "https://images.unsplash.com/photo-1653239527871-17685d34b150?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHw0fHxzYW50YSUyMGNydXolMjBjb2FzdCUyMG1vcm5pbmd8ZW58MHx8fHwxNzczMDI2NTcyfDA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "coastal-divider-mood",
        "description": "Minimal coastal horizon for section break imagery (keep subtle, low contrast).",
        "url": "https://images.unsplash.com/photo-1653239526932-a4655c24af47?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwzfHxzYW50YSUyMGNydXolMjBjb2FzdCUyMG1vcm5pbmd8ZW58MHx8fHwxNzczMDI2NTcyfDA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "blog-card-cover-alt",
        "description": "Gym equipment in daylight (use as fallback blog card cover; ensure it’s brightened).",
        "url": "https://images.unsplash.com/photo-1702997831866-8c22e3d796f9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxzdHJlbmd0aCUyMHRyYWluaW5nJTIwZ3ltJTIwZGF5bGlnaHR8ZW58MHx8fHwxNzczMDI2NTc3fDA&ixlib=rb-4.1.0&q=85"
      }
    ],
    "image_treatment": {
      "overlays": {
        "light_overlay_css": "background: linear-gradient(180deg, rgba(247,245,240,0.88) 0%, rgba(247,245,240,0.62) 45%, rgba(247,245,240,0.30) 100%);",
        "rule": "No dark overlays; keep text legible with light neutral overlays and add subtle text shadow only if needed."
      },
      "rounding": "rounded-[28px]",
      "borders": "border border-[rgba(13,93,62,0.12)]"
    }
  },
  "additional_libraries": {
    "framer_motion": {
      "why": "Micro-interactions and section reveals that feel premium and alive.",
      "install": "npm i framer-motion",
      "notes": "Use motion.div with initial/whileInView; gate with prefers-reduced-motion."
    },
    "recharts_optional": {
      "why": "Optional ‘Progress examples’ mini chart on Personal Training page (tasteful, minimal).",
      "install": "npm i recharts",
      "empty_state": "If no data, show a Card with an illustrative message and a CTA to book consult."
    }
  },
  "data_testid_convention": {
    "rules": [
      "kebab-case",
      "Describe role, not appearance",
      "Required on: buttons, links, inputs, menus, accordions triggers, quiz options, key text outputs (e.g., error messages, confirmation headers)."
    ],
    "examples": [
      "data-testid=\"lead-quiz-option-get-stronger\"",
      "data-testid=\"home-benefits-card-coach-led\"",
      "data-testid=\"contact-form-submit-button\"",
      "data-testid=\"blog-pagination-next-button\""
    ]
  },
  "instructions_to_main_agent": [
    "Create a marketing light theme scope (e.g., add class .theme-marketing-light on marketing layout wrapper) so CRM/staff pages remain dark.",
    "Update /app/frontend/src/App.css root background only for marketing routes; do not break CRM.",
    "Switch body font to Nunito for marketing pages; keep Bebas Neue for hero only via .font-display.",
    "Implement wave dividers as a reusable React component (JS) and use between hero/benefits, benefits/editorial, testimonials/FAQ, etc.",
    "Build the 5-step quiz as a controlled component with progress bar + step label + auto-advance; use shadcn components only (no raw HTML dropdowns etc).",
    "Ensure every interactive element and key info text includes data-testid attributes.",
    "Avoid gradients except subtle hero/section decorative overlays, under 20% viewport; never on dense text blocks."
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
