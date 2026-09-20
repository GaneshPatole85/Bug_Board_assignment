# BugBoard Design System — "Engineering Console" Identity

## 1. Overview & Philosophy
BugBoard’s audience is developers, QA engineers, and engineering administrators — technical users who value density, clarity, efficiency, and tactile responsiveness over decorative flare.
The design personality is **"Engineering Console"**:
- **Precise & quiet**: Hairline dividers (`1px solid var(--color-border)`) rather than heavy drop shadows.
- **Information-dense**: 15px base body text, compact tables, and tight data paddings.
- **Accessible & functional**: Status, priority, and severity always pair color with distinctive geometric shapes and textual labels. Never color alone.

---

## 2. Color Palette & CSS Custom Properties

### Core Tokens (`:root` Light Theme Baseline)
```css
--color-canvas:      #F7F8FA;  /* Page background */
--color-surface:     #FFFFFF;  /* Cards, table rows, panels */
--color-border:      #E2E5EA;  /* Hairline dividers */
--color-ink:         #14171F;  /* Primary text (high contrast) */
--color-slate:       #5B6472;  /* Secondary / muted text */
--color-accent:      #0E7C7B;  /* Deep teal: primary actions, active tabs, focus rings */
--color-accent-hover:#0A5F5E;  /* Accent hover */
--color-accent-ink:  #FFFFFF;  /* Text on accent backgrounds */
```

### Dark Theme Override (`[data-theme="dark"]`)
```css
--color-canvas:      #0F1117;
--color-surface:     #171A21;
--color-border:      #242933;
--color-ink:         #F0F3F7;
--color-slate:       #8A92A0;
--color-accent:      #17A398;
--color-accent-hover:#128279;
--color-accent-ink:  #FFFFFF;
```

---

## 3. Data Taxonomy & Badge Specifications

### Status Ramp (Paired with icon + text label)
| Status | Token | Value | Visual Representation |
|---|---|---|---|
| **Open** | `--status-open` | `#5B6472` | Hollow Circle icon + Muted Gray badge |
| **In Progress** | `--status-in-progress` | `#2B6CB0` | Clock/Progress icon + Steel Blue badge |
| **Testing** | `--status-testing` | `#7C5CBF` | Flask/Flask icon + Violet badge |
| **Resolved** | `--status-resolved` | `#1F9D6B` | Checkmark icon + Emerald Green badge |
| **Closed** | `--status-closed` | `#8A8F98` | Cross/Archived icon + Slate Gray badge |

### Priority Ramp (Warm Ramp — Circular Dot Indicator)
| Priority | Token | Value | Visual Representation |
|---|---|---|---|
| **Low** | `--priority-low` | `#8A8F98` | 7px Slate circle |
| **Medium** | `--priority-medium` | `#D6A419` | 7px Amber circle |
| **High** | `--priority-high` | `#E0793C` | 7px Burnt Orange circle |
| **Urgent** | `--priority-urgent` | `#D64545` | 7px Crimson Red circle |

### Severity Ramp (Cool/Violet Ramp — Square Indicator)
Visually and geometrically distinct from priority even for colorblind users:
| Severity | Token | Value | Visual Representation |
|---|---|---|---|
| **Low** | `--severity-low` | `#5B6472` | 7px Muted Gray square |
| **Medium** | `--severity-medium` | `#4C6FDC` | 7px Indigo square |
| **High** | `--severity-high` | `#8547D1` | 7px Deep Violet square |
| **Critical** | `--severity-critical` | `#B0234B` | 7px Ruby Burgundy square |

---

## 4. Typography Rules

1. **Prose, Buttons, & Controls**:
   - **Inter** font family (`--font-sans`).
   - Base body: `15px` (`line-height: 1.5`).
   - Page Titles: `24px–26px` (`font-weight: 700`, `line-height: 1.3`).
   - Section Headers: `17px–20px` (`font-weight: 600`).
2. **Technical Identifiers (Monospace)**:
   - **JetBrains Mono** (`--font-mono`).
   - Used **strictly and only** for:
     - Issue keys (e.g. `CORE-101`, `UI-404`).
     - Project code badges (e.g. `CORE`, `UI`).
     - Audit timestamps in the activity timeline.
   - Never used for prose, buttons, or form labels.
3. **Copywriting Standards**:
   - Direct, plain English ("Create issue", not "Create Issue →").
   - No tracked-out all-caps text or pseudo-tech jargon.

---

## 5. Responsive Layout Breakpoints

### Desktop (`>1024px`)
- **Top Header**: Brand mark, environment status dot, user profile with role badge, sign out.
- **Sidebar**: Sticky left navigation (Dashboard, Projects, Issues).
- **Issues View**: Full-width data table with Key, Title, Status, Priority, Severity, Assignee avatar, Reporter, and Date.
- **Issue Detail View**: Two-column split layout:
  - Left panel: Issue Title, Description, Phase 4 Comment List, Activity Audit Feed.
  - Right panel: Sticky Details Console (legal transition triggers, assignee selector, reporter attribution, timestamps).

### Tablet (`640px–1024px`)
- **Sidebar**: Collapses to an icon-only rail to conserve screen real estate.
- **Issues View**: Dense table automatically hides secondary columns (`Reporter`, `Date`).

### Mobile (`<640px`)
- **Sidebar**: Transforms into a full slide-in drawer toggled by the hamburger menu (`☰`).
- **Issues View**: Switches from a table into a stacked card list (`IssueCard`).
- **Filters**: Moves into a slide-up bottom sheet drawer (`Drawer`) activated by the "Filters •" toolbar button.
- **Issue Detail View**: Right-side details console moves directly above the description as a compact 3-column summary block.

---

## 6. Interaction & State Specifications

Every view in BugBoard satisfies four explicit states:
1. **Loading**: Structural skeleton loaders (`SkeletonRow`, `SkeletonCard`) matching the exact layout dimensions.
2. **Empty**: Context-specific guidance (e.g. "No issues match these filters — try clearing them" vs. "This project has no issues yet — create the first one") with an actionable CTA button.
3. **Error**: Transparent explanation of failure with an immediate "Retry" button.
4. **Success Feedback**: Transient toast notifications (`ToastContext`) confirming writes ("Issue created", "Status updated to Testing").

---

## 7. Accessibility Floor (WCAG AA Compliance)
- **Focus Rings**: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`.
- **Contrast**: High contrast ink (`#14171F` on `#FFFFFF` / `#F7F8FA` ratio > 12:1). Accent teal (`#0E7C7B` on `#FFFFFF` ratio > 4.5:1).
- **Reduced Motion**: All animations and transitions gracefully reduce to instant state changes when `prefers-reduced-motion: reduce` is active.
