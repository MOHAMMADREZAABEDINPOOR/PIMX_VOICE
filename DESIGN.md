---
name: PIMXVOICE
description: A compact bilingual control surface for live video subtitles and dubbing.
colors:
  marine-shell: "#101f2d"
  marine-panel: "#192d3c"
  marine-raised: "#223b4b"
  pale-ink: "#edf4f7"
  muted-blue: "#a6bbc6"
  turquoise: "#83ddd3"
  turquoise-ink: "#102e33"
  marine-line: "#304858"
  dark-error: "#ffb3ac"
  dark-error-surface: "#3b2930"
  dark-warning: "#f5c879"
  marine-preview: "#0b1722"
  dark-focus: "#a9eee5"
  porcelain: "#f3f7f9"
  white: "#fff"
  porcelain-raised: "#e6eef2"
  marine-ink: "#183341"
  muted-marine: "#506978"
  deep-teal: "#176b72"
  porcelain-line: "#cedce3"
  light-error: "#ab302c"
  light-error-surface: "#fff0ee"
  light-warning: "#875700"
  porcelain-preview: "#e7eff3"
  subtitle-secondary: "#a8e8e1"
  subtitle-surface: "#091623"
  subtitle-outline: "#000000"
typography:
  headline:
    fontFamily: "Luma, Tahoma, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.6
    letterSpacing: "-.025em"
  onboarding-title:
    fontFamily: "Luma, Tahoma, sans-serif"
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.6
    letterSpacing: "-.025em"
  title:
    fontFamily: "Luma, Tahoma, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  body:
    fontFamily: "Luma, Tahoma, sans-serif"
    fontSize: "13px"
  label:
    fontFamily: "Luma, Tahoma, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  metadata:
    fontFamily: "Luma, Tahoma, sans-serif"
    fontSize: "11px"
    lineHeight: 1.8
  wordmark:
    fontFamily: "Luma, Tahoma, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-.035em"
  caption-compact:
    fontFamily: "Tahoma"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  caption-primary:
    fontFamily: "Tahoma"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.6
  caption-secondary:
    fontFamily: "Tahoma"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.6
rounded:
  mode: "6px"
  tab: "7px"
  icon: "8px"
  control: "9px"
  navigation: "10px"
  container: "12px"
  switch: "20px"
spacing:
  tiny: "4px"
  compact: "8px"
  normal: "10px"
  comfortable: "12px"
  guide-inline: "16px"
  roomy: "17px"
  gutter: "22px"
components:
  button-primary:
    backgroundColor: "{colors.turquoise}"
    textColor: "{colors.turquoise-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  button-primary-light:
    backgroundColor: "{colors.deep-teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    height: "44px"
  button-stop:
    backgroundColor: "{colors.marine-raised}"
    textColor: "{colors.pale-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  field:
    backgroundColor: "{colors.marine-panel}"
    textColor: "{colors.pale-ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "42px"
  select-trigger:
    backgroundColor: "{colors.marine-panel}"
    textColor: "{colors.pale-ink}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "42px"
  select-menu:
    backgroundColor: "{colors.marine-panel}"
    textColor: "{colors.pale-ink}"
    rounded: "{rounded.container}"
    padding: "5px"
  select-option:
    rounded: "{rounded.tab}"
    padding: "8px 10px"
  style-field:
    backgroundColor: "{colors.marine-panel}"
    textColor: "{colors.pale-ink}"
    rounded: "{rounded.icon}"
    height: "38px"
  mode-selected:
    backgroundColor: "{colors.turquoise}"
    textColor: "{colors.turquoise-ink}"
    rounded: "{rounded.mode}"
    padding: "7px 4px"
  navigation:
    backgroundColor: "{colors.marine-panel}"
    rounded: "{rounded.navigation}"
    padding: "4px"
  caption-preview:
    backgroundColor: "{colors.marine-preview}"
    rounded: "{rounded.container}"
  guide:
    backgroundColor: "{colors.marine-panel}"
    rounded: "{rounded.container}"
    padding: "12px 16px"
---

# Design System: PIMXVOICE

## Overview

**Creative North Star: "Broadcast caption continuity"**

PIMXVOICE retains the marine shell, restrained turquoise actions, and familiar labelled controls of the established popup. Its broadcast character comes from a compact session surface, visible recording state, and bilingual caption preview. Translation, subtitle appearance, and API keys occupy three persistent views inside the popup.

Persian and English share the locally bundled Vazirmatn interface font, directional layouts, and control hierarchy. The light theme uses cool porcelain surfaces and deep teal actions. Caption typography is independently configurable and does not change the interface font. The PIMXVOICE name and new logo were explicitly requested by the user; this record describes the implementation without implying approval of every visual choice.

The identity asset is the generated P/X speech-ribbon monogram in `assets/pimxvoice-logo.png`. The header uses its resampled toolbar copy (`icons/48.png`) at 34px square beside the wordmark. Exact generation provenance and the prompt are preserved in `assets/logo-prompt.txt`; do not redraw or substitute a generic audio symbol.

**Key Characteristics:**
- Fixed compact popup with persistent navigation and session action.
- Independent dubbing and one- or two-language subtitle controls.
- Tonal surface separation with flat resting controls.
- Equal Persian/English layouts and paired dark/light themes.
- A distinct P/X identity asset with a restrained split-weight wordmark.

## Colors

The palette combines cool marine neutrals with one turquoise interface accent, translated to deep teal on light surfaces. The identity asset contains its own navy, turquoise and periwinkle treatment; these bitmap colors are not new interface accents.

### Primary
- **Turquoise:** Primary actions, selected output mode, enabled switches, and live indicators in dark mode; turquoise ink provides text contrast.
- **Deep Teal:** The corresponding light-theme action, link, switch, selected-mode and focus color; primary text is white.

### Neutral
- **Marine Shell / Panel / Raised / Preview:** App background, form and navigation surfaces, selected tabs, and caption inset respectively.
- **Pale Ink / Muted Blue / Marine Line:** Main copy, secondary copy, and dividers in dark mode.
- **Porcelain / White / Porcelain Raised / Porcelain Preview:** Corresponding light-mode background, panel, selected tab, and caption inset.
- **Marine Ink / Muted Marine / Porcelain Line:** Main copy, secondary copy, and dividers in light mode.
- **Error and warning pairs:** Theme-specific error ink/surface and amber busy state.
- **Subtitle defaults:** White primary text, pale turquoise secondary text, a near-black marine surface at 88% opacity, and a black outline color whose default width is zero. Users can change these independently of theme.

**The State Has Words Rule.** Pair the recording or processing dot with a text label. State is not conveyed by color alone.

## Typography

**Interface Font:** Locally hosted Vazirmatn, registered in CSS as `Luma`, with Tahoma and sans-serif fallbacks. The internal font alias remains unchanged after the rebrand. The bundled variable font covers weights 100-900.

**Caption Font:** Tahoma by default. Users can select Arial, Georgia, a system sans-serif, or upload WOFF2, WOFF, TTF, or OTF. Uploaded fonts are local and are loaded into the preview; they do not replace interface typography.

### Hierarchy
- **Wordmark:** PIMX is weight 700; VOICE is weight 450 in muted ink, at the same size and tracking.
- **Headline:** Functional view headings; the onboarding welcome is one step larger.
- **Title:** Setup guide headings.
- **Body:** Base interface scale; primary action labels use weight 650.
- **Label:** Form labels and tabs. Custom-select triggers and options use 12px; LTR triggers carrying model IDs use 11px. Output modes, model status, key details, and helper text use metadata sizing.
- **Caption Primary / Secondary:** Defaults for the appearance preview and on-video captions. Each line has independently editable size and color, sharing font family, weight, line height and decoration.
- **Compact Caption:** Translation-view preview uses a fixed 16px primary and 14px secondary line, line-height 1.4 and padding 2px 6px. Other user styling still applies.

**The Independent Lines Rule.** Keep both subtitle language choices independent of the dubbing language, and preserve `dir="auto"` on each preview line. The second line may be another translation or the source language.

## Layout

Both the root HTML element and body establish an intrinsic width of 420px, with matching minimum and maximum widths, and a height of 600px. This stable size is available before Chromium measures the popup. The body is a flex column with hidden outer overflow. Header, navigation and footer do not shrink. Main content takes the remaining height and scrolls vertically. Within the Translation view, a separate session scroller holds configuration and caption preview; the action area sits outside it so the start/stop control stays visible when settings expand.

Horizontal gutters are 22px. A legacy narrow-viewport rule reduces header/main/navigation gutters to 17px, but the popup shell retains its fixed intrinsic width. The header has 12px vertical padding; the footer has 9px. Dubbing language and narrator occupy equal columns with a 12px gap. The live-model selector is always visible below them. Supporting text/voice models and source language live inside a separate advanced disclosure.

The three equal navigation controls select Translation, Subtitles, and API keys. Output mode is a separate three-choice segmented group: dubbing only, subtitles only, or both. Language and narrator controls disappear when dubbing is disabled; subtitle summary and compact preview disappear in dubbing-only mode.

Subtitle appearance uses a sticky preview at the top of its scrollable main view. Its preview text is capped at 150px and can scroll internally. Style fields use a two-column grid with 13px row and 16px column gaps. Further styling and key creation use disclosures. API-key rows use flexible information and intrinsic action columns.

RTL changes reading order and alignment. Model IDs and credential entry retain LTR direction. Use logical padding, margins and direction-aware alignment when extending the popup.

The shared selector menu is fixed to the popup viewport and aligned to its trigger according to interface direction. It uses a minimum preferred width of 260px, capped to the viewport minus 10px margins on each side, and a maximum height of 310px. It opens above when the lower space is under 220px and the upper space is larger. Its option list scrolls independently.

**The Stable Popup Rule.** Keep intrinsic root/body sizing independent of viewport-relative width. Fit floating menus inside the popup bounds rather than allowing their content to resize the popup.

## Elevation & Depth

Resting interface surfaces use tonal layering, borders, and separators, with no ornamental gradients or ambient panel shadows. The floating selector menu is the structural elevation exception: `0 12px 28px #0005` separates it from the controls it covers. It uses a fixed overlay layer at z-index 10000. The stop action uses an inset one-pixel line; keyboard focus uses a two-pixel theme focus outline with a three-pixel offset.

The logo's internal material treatment belongs to the supplied asset. Caption decoration is separately user-controlled: default text shadow is `0 2px 4px #0008`, while outline, opacity and background can be changed. Neither caption decoration nor the logo establishes an interface shadow vocabulary.

Primary hover brightness transitions over 150ms; the switch thumb and advanced-model chevron move over 160ms with ease-out. Select-trigger borders transition over 140ms with ease-out. Reduced-motion preference removes interface transitions.

## Shapes

Segmented output choices use the smallest control corner. Tabs, icon buttons, fields/actions, navigation rails, and preview/guide containers use progressively softer radii from the frontmatter. Switches and status dots are fully rounded. The P/X brand mark is the generated image asset, replacing the earlier four-bar mark. Utility SVGs remain outline icons, generally 19px with 1.7px rounded strokes.

Caption radius is user-editable from 0-24px, defaulting to 8px; it is independent of interface container radii. Caption padding is also user-editable, with a default of 12px horizontally and half that vertically in the appearance preview.

## Components

### Buttons

The full-width primary action uses theme accent/ink, a minimum 44px height, weight 650, and a 9px icon/text gap. Hover increases brightness to 1.07. During a session, stop uses raised neutral fill and an inset border. Disabled controls reduce opacity to 0.5.

Header icon and locale buttons are quiet, at least 34px square, with muted ink and transparent backgrounds; hover adds a raised surface. Text actions are underlined accent ink; destructive actions use error ink. Font upload is a bordered 42px-high labelled button beside the font select.

### Navigation and Output Modes

Navigation contains three equal text buttons inside a padded panel rail. Active tabs use raised surface and main ink; inactive tabs are muted. Output modes form a distinct three-button group with accent fill and contrasting ink for the selected choice, smaller type and 6px corners. Both groups expose pressed state.

### Inputs / Fields

Key inputs use a panel background, one-pixel border, 42px height, 9px corners and 10px horizontal padding, reserving room for a reveal button. Numeric and color style fields are 38px tall with 8px corners; color swatches use 5px inner padding. All interactive elements share visible keyboard focus.

### Searchable Selects

Every native select remains the value source but is hidden behind a labelled custom trigger. Triggers share the field surface, one-pixel border, 9px corners and 42px height, with 11px horizontal padding. Compact style-grid triggers are 38px tall and retain 9px corners. The chosen label truncates with ellipsis while a 14px SVG chevron stays visible. Open state uses an accent border and rotates the chevron; disabled state uses 0.6 opacity. LTR identifiers keep their direction independently of the interface.

One shared fixed menu is created for the active trigger. Its panel uses a container corner, a one-pixel border, 5px inset and the floating elevation. A search row with a 16px SVG search icon and 30px-high search field sits above a scrollable listbox. Option rows are at least 36px high, with 8px by 10px padding, 7px corners and 1.7 line height. Highlighted rows use the raised surface; selection uses accent ink and an authored 15px SVG check. An empty result uses centered muted copy.

Opening moves focus to search. Arrow keys, Home/End and Page Up/Down move the highlight; Enter selects; Escape closes and restores trigger focus. Tab closes and moves to the adjacent focusable control. Search filters names and values, normalizes Persian/Arabic letter variants and diacritics, and supports alternate language-name search data. Outside interaction or container scrolling closes the menu; resize recalculates placement. Trigger expanded state, listbox option selection and active descendant are exposed through ARIA.

### Model Selection and Disclosure

The live-model selector and refresh action remain visible without opening advanced details. A polite live status below the selector shows loading, available-model count, an error, or an empty catalog. Loading marks the trigger busy; loading and empty catalogs disable model selection. With no live models, starting is unavailable while an existing session can still be stopped. Missing catalogs refresh automatically when a stored key is present and no session is active.

The advanced disclosure contains supporting text/voice model controls and source-language selection. Its authored 14px SVG chevron rotates 180 degrees when open. The narrator's native voice entry remains labelled "Model default" or its Persian equivalent.

### Switches

A 34 by 20px track contains a 12px thumb. Off uses line surface and a text-colored thumb; on uses accent and accent-ink. Labels and helper lines explain each setting. The thumb moves 14px, with a reduced-motion alternative.

### Bilingual Caption Preview

The Translation view shows a compact live/example preview. The Subtitles view shows a larger sticky appearance preview with reset action. Both apply selected font, line colors, background opacity, stroke, shadow, alignment and radius. The second line appears only when dual subtitles are enabled. Samples are labelled as appearance examples until real session content replaces them in the Translation view.

### Key List

Keys appear in separated rows with a visible user label and masked suffix; the complete credential is not displayed in the list. A small accent dot and text identify the first-priority key. Backup rows offer preference and removal actions. Key actions and credential form controls disable during an active session. The add-key disclosure starts expanded below the list so the next-key form is immediately available; help remains collapsible. Fresh installs start in English, while saved language choices are preserved.

### Status and Setup

A six-pixel status dot accompanies readable state text: muted ready, accent live, warning busy. The API-key setup guide uses a panel surface, 12px by 16px padding and a 12px corner. Setup, settings groups and key rows use clear labels and separator lines rather than decorative cards.

## Do's and Don'ts

### Do:
- **Do** use theme semantic roles for interface surfaces, copy, actions, and status.
- **Do** keep the main session action outside the scrollable configuration area.
- **Do** pair session color with readable state text.
- **Do** preserve independent direction and language selection for caption lines.
- **Do** reuse the supplied PIMXVOICE identity asset and local bilingual interface font.
- **Do** preview uploaded fonts and caption styling without changing interface typography.
- **Do** keep key-list credentials masked and user labels readable.
- **Do** use the shared searchable selector for new selection fields, preserving focus, direction and disabled state.
- **Do** keep live-model availability visible beside its selector.

### Don't:
- **Don't** add ornamental interface gradients or spread the floating-menu shadow onto resting panels.
- **Don't** use viewport-relative shell width that can feed back into Chromium popup sizing.
- **Don't** treat user-selected subtitle colors, sizes, or shadows as interface defaults.
- **Don't** replace clear field labels with unexplained icon controls.
- **Don't** apply the dark theme's pale action pairing to light interface surfaces.
- **Don't** restore the retired four-bar Luma mark or name as visible branding.
