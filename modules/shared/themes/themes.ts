
export const THEMES: Record<string, Record<string, string>> = {
  present3d: {},


  light: {},

 
  dark: {

    "--kd-accent": "#0a9ad8",
    "--kd-accent-hover": "#22aef0",
    "--kd-accent-active": "#0088cc",
    "--kd-accent-soft": "#00a6ee26",
    // Neutral surfaces ke upar saturated blue patch ban
    // ke chipakta tha. Neutral ki taraf khinch diya taaki tint lage,
    // sticker nahi.
    "--kd-accent-subtle": "#16242e",
    "--kd-on-accent": "#ffffff",
    "--kd-scrollbar-thumb": "#3e5260",
    "--kd-scrollbar-thumb-hover": "#587486",

    /* Surfaces
       Dark me depth shadow se NAHI aati (black-on-black invisible hai) —
       surface ke lighter hone se aati hai. Isliye well ko neeche gira ke
       aur elevated ko upar utha ke har level ke beech asli gap banaya
       gaya hai. Neutrals me halka cool tint accent ke hue se mel
       khata hai; pure gray dark me dead lagta tha. */
    "--kd-bg-app": "#0e0e13",
    "--kd-bg-surface": "#1a1a21",
    "--kd-bg-elevated": "#2a2a35",
    "--kd-bg-sunken": "#131319",
    "--kd-bg-hover": "#31313d",
    "--kd-bg-overlay": "#000000b3",

    // Canvas ka mat. Page ka background theme follow nahi karta, to dark
    // me ek white/bright page #1a1a21 well par ~17:1 ka cliff banata tha —
    // aankh page par lock ho jaati thi aur baaki UI gayab. Mid-tone mat
    // us jump ko ~12:1 par le aata hai, jaise photo frame ka mount.
    "--kd-bg-canvas-well": "#34343f",

    /* Text
       #ececf1 par body text 14.4:1 tha — dark me itna near-white halation
       deta hai (letters ke around glow). ~12.7:1 par le aaye. */
    "--kd-text": "#dcdce4",
    "--kd-text-muted": "#a3a3b0",
    "--kd-text-subtle": "#70707e",
    "--kd-text-inverse": "#17171c",

    /* Borders — dark me ye hi ek kaam karta hua depth cue tha, isliye
       thoda strong. Swatch grid ke black swatches panel me ghul rahe the. */
    "--kd-border": "#ffffff2e",
    "--kd-border-subtle": "#ffffff1c",
    "--kd-border-strong": "#ffffff4d",
    "--kd-border-inverse": "#00000040",

    /* Status */
    "--kd-danger": "#f87171",
    "--kd-danger-soft": "#3a1d1d",
    "--kd-success": "#4ade80",
    "--kd-success-soft": "#15291d",
    "--kd-warning": "#fbbf24",
    "--kd-warning-soft": "#33260f",

    /* Elevation
       Har shadow ke saath ek 1px rim-light. Akela black shadow dark
       backdrop par kuch nahi karta; rim hi batata hai ki surface upar
       hai. Ye teeno token sirf box-shadow me use hote hain, isliye
       multi-layer value safe hai. */
    "--kd-shadow-color": "#00000080",
    "--kd-shadow-sm": "0 1px 3px #00000099, 0 0 0 1px #ffffff0f",
    "--kd-shadow-lg": "0 6px 18px #000000a6, 0 0 0 1px #ffffff14",
    "--kd-shadow-popup": "0 12px 32px #000000b3, 0 0 0 1px #ffffff1a",
    "--kd-shadow-color-strong": "#00000099",
    "--kd-focus-ring": "0 0 0 3px #22aef040",
    "--kd-ring": "#22aef066",

    // Tooltip / thumbnail badge ka bg. #26262e surface (#1c1c22) ke
    // itna paas tha ki dark me tooltip dikhta hi nahi tha — isliye
    // upar utha diya.
    "--kd-bg-black": "#43434ff2",
    "--kd-heder-btn-hover-bg": "#ffffff1a",
    "--kd-active-bg": "#3d3d4a",

    /* Brand gradient
       Light me ye backdrop se DARKER band hai — header neeche baith ke
       anchor karta hai. Dark me wahi gradient sabse bright chrome ban
       jaata tha aur aage aa jaata tha. Deeper stops se wo wapas shelf
       ki tarah behave karta hai, aur uske upar white text 5.4:1 se
       ~7.5:1 par chala jaata hai. */
    "--kd-gradient-brand":
      "linear-gradient(90deg, var(--kd-brand-800) 0%, var(--kd-brand-700) 50%, var(--kd-brand-600) 100%)",
    "--kd-gradient-accent":
      "linear-gradient(180deg, var(--kd-brand-500) 0%, var(--kd-brand-700) 100%)",
    "--kd-gradient-soft":
      "linear-gradient(135deg, var(--kd-accent-subtle), #1d3442)",
  },
};
