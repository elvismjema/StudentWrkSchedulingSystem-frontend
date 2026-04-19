/**
 * Vuetify 3 plugin.
 *
 * This file is one of two places in src/ that is allowed to spell hex codes
 * directly — the other is src/styles/tokens.css. Everything else should pull
 * from those tokens (either via Vuetify color props or `var(--token)` in CSS).
 *
 * The theme key is `swsLight` (renamed from the older generic key). Color keys
 * mirror the design tokens from PLAN-manager-web-ui-spec.md so that
 * `color="success"` yields the state-active green, not the brand maroon.
 */
import { createVuetify } from "vuetify";

// Misc
import { loadFonts } from "./webfontloader";
loadFonts();

// Styles
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

/**
 * Canonical SWS light theme. Keep color values in sync with
 * src/styles/tokens.css — they are mirrored, not derived, because Vuetify
 * compiles theme colors into variant utility classes at boot.
 *
 * @deprecated legacy color keys (`teal`, `blue`, `yellow`, `darkblue`, plus
 *   the old `accent` alias) are retained for backward compatibility with
 *   existing views that reference them directly. New code must use the
 *   token-named keys (`brandPrimaryDk`, `stateActive`, `position1`, etc.)
 *   and the legacy keys will be removed once downstream callers migrate.
 */
const swsLight = {
  dark: false,
  colors: {
    // --- Vuetify semantic keys ---
    primary: "#80162B",           // brand-primary (OC maroon)
    secondary: "#E1E1E1",
    accent: "#47121D",            // brand-accent (hero moments, NOT success)
    success: "#3F7A4D",           // state-active — was aliased to maroon; fixed
    warning: "#C67B3C",           // state-break
    error: "#B8402E",             // state-alert
    info: "#2F6B8F",              // state-info

    // --- Brand ---
    brandPrimaryDk: "#5E0F20",
    brandPrimaryLt: "#F6E6EA",
    brandInk: "#1F1214",

    // --- Surfaces / borders ---
    surface1: "#FAFAFA",
    surface2: "#F4F4F5",
    border1: "#E4E4E7",

    // --- State tints ---
    stateActive: "#3F7A4D",
    stateActiveLt: "#E3F1E7",
    stateBreak: "#C67B3C",
    stateBreakLt: "#FBEEDE",
    stateAlert: "#B8402E",
    stateAlertLt: "#F7E3DE",
    stateInfo: "#2F6B8F",
    stateInfoLt: "#E1EEF5",

    // --- Position palette (off-brand by design) ---
    position1: "#4F6D8C",
    position2: "#6E8E5E",
    position3: "#8F6B3F",
    position4: "#5C5A8A",
    position5: "#2F6B6F",
    position6: "#8A5A6B",
    position7: "#6B5A3F",
    position8: "#4D4D55",

    // --- @deprecated legacy keys ---
    // Retained for backward compatibility. Do not use in new code.
    teal: "#63BAC0",
    blue: "#196CA2",
    yellow: "#F8C545",
    darkblue: "#032F45",
  },
};

const vuetify = createVuetify({
  theme: {
    defaultTheme: "swsLight",
    themes: {
      swsLight,
    },
  },
  icons: {
    defaultSet: "mdi",
  },
});

export default vuetify;
