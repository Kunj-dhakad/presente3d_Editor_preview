const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const interactionIconSvg = {
  "link-area": svg(
    '<path d="M10.5 13.5a4.25 4.25 0 0 0 6.01.01l2-2a4.25 4.25 0 0 0-6.01-6.01l-1.15 1.14"/><path d="M13.5 10.5a4.25 4.25 0 0 0-6.01-.01l-2 2a4.25 4.25 0 0 0 6.01 6.01l1.14-1.14"/><rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="2.5 2.5"/>',
  ),
  "link-button": svg(
    '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10 14l4-4M10.5 10H14v3.5"/>',
  ),
  tag: svg(
    '<path d="M20 13.5 13.5 20a2 2 0 0 1-2.83 0L4 13.33V4h9.33L20 10.67a2 2 0 0 1 0 2.83Z"/><circle cx="8.5" cy="8.5" r="1"/>',
  ),
  caption: svg(
    '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/>',
  ),
  "video-button": svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/>'),
  "audio-button": svg('<path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M15 9a4 4 0 0 1 0 6"/>'),
  "audio-playing": svg('<path d="M9 6v12M15 6v12"/>'),
  "popup-slideshow": svg('<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M7 20h10a2 2 0 0 0 2-2V8"/><circle cx="8" cy="16.5" r="0.8" fill="currentColor"/><circle cx="12" cy="16.5" r="0.8" fill="currentColor"/><circle cx="16" cy="16.5" r="0.8" fill="currentColor"/>'),
  slideshow: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m9 10 4 2.5L9 15v-5Z"/><circle cx="8" cy="16.5" r="0.7" fill="currentColor"/><circle cx="12" cy="16.5" r="0.7" fill="currentColor"/><circle cx="16" cy="16.5" r="0.7" fill="currentColor"/>'),
  "nav-prev-page": svg('<path d="m15 18-6-6 6-6"/>'),
  "nav-next-page": svg('<path d="m9 18 6-6-6-6"/>'),
  "nav-goto-page": svg('<path d="M7 17 17 7M8 7h9v9"/>'),
  "nav-first-page": svg('<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>'),
  "nav-last-page": svg('<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>'),
  "product-card": svg(
    '<path d="M2.5 3h2l2.4 12.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="9.5" cy="20" r="1"/><circle cx="17.5" cy="20" r="1"/>',
  ),
  "product-button": svg(
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  ),
  "price-tag": svg(
    '<path d="M20 13.5 13.5 20a2 2 0 0 1-2.83 0L4 13.33V4h9.33L20 10.67a2 2 0 0 1 0 2.83Z"/><circle cx="8.5" cy="8.5" r="1"/>',
  ),
  TikTok: svg(
    '<path d="M14 4v9.5a3.5 3.5 0 1 1-3-3.46"/><path d="M14 4c.6 2.45 2.1 3.95 4.5 4.5"/>',
  ),
  Pinterest: svg(
    '<path d="M12 21c1.1-2.4 1.8-4.23 2.05-5.48"/><path d="M9.3 14.3c-1.2-.7-2-2.1-2-3.8 0-2.8 2.1-5 5-5 3.15 0 4.8 2.25 4.8 4.6 0 3.2-1.4 5.6-3.5 5.6-1.15 0-2-1-1.7-2.2l.65-2.75c.38-1.6-.2-2.8-1.36-2.8-1.08 0-1.9 1.1-1.9 2.58 0 .93.32 1.56.32 1.56l-1.3 5.5"/>',
  ),
  Reddit: svg(
    '<circle cx="12" cy="12.5" r="7"/><path d="M12 5.5 13 3l2.5.65M8.5 12h.01M15.5 12h.01M8.5 15c1.8 1.3 5.2 1.3 7 0M5.2 10.2 3.5 9M18.8 10.2 20.5 9"/>',
  ),
  Spotify: svg(
    '<circle cx="12" cy="12" r="8.5"/><path d="M7.8 10.1c3.1-.9 6.5-.55 8.7.7M8.4 13c2.55-.7 5.3-.42 7.25.62M9 15.65c1.92-.48 3.92-.22 5.5.5"/>',
  ),
  YouTube: svg(
    '<path d="M20.2 7.1a2.5 2.5 0 0 0-1.76-1.77C16.9 5 12 5 12 5s-4.9 0-6.44.33A2.5 2.5 0 0 0 3.8 7.1C3.47 8.65 3.47 12 3.47 12s0 3.35.33 4.9a2.5 2.5 0 0 0 1.76 1.77C7.1 19 12 19 12 19s4.9 0 6.44-.33a2.5 2.5 0 0 0 1.76-1.77c.33-1.55.33-4.9.33-4.9s0-3.35-.33-4.9Z"/><path d="m10 9 5 3-5 3V9Z"/>',
  ),
  Instagram: svg(
    '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><path d="M17.5 6.5h.01"/>',
  ),
  Messenger: svg(
    '<path d="M20 11.5c0 4.14-3.58 7.5-8 7.5-1.1 0-2.15-.2-3.1-.6L4 20l1.45-3.25A7.05 7.05 0 0 1 4 12c0-4.14 3.58-7.5 8-7.5s8 3.36 8 7.5Z"/><path d="m8 13 2.8-3 2.1 2 3.1-3"/>',
  ),
  Facebook: svg(
    '<path d="M14 21v-8h3l.5-3H14V8.25C14 7.38 14.3 7 15.42 7H17.5V4.3A25 25 0 0 0 15.65 4C12.9 4 11 5.68 11 8.75V10H8v3h3v8"/>',
  ),
  LinkedIn: svg(
    '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10v6M8 7.5h.01M11.5 16v-3.4a2.1 2.1 0 0 1 4.2 0V16M11.5 10v6"/>',
  ),
  X: svg('<path d="M5 4.5 19 19.5M19 4.5 5 19.5"/>'),
  WhatsApp: svg(
    '<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.2-.45.45-.45.7-.45h.5c.16 0 .35.05.43.3l.65 1.55c.1.25.05.42-.05.58l-.4.48c-.13.13-.25.26-.1.5.15.25.67 1.1 1.44 1.78.99.87 1.82 1.14 2.08 1.27"/>',
  ),
  Snapchat: svg(
    '<path d="M8.4 18c.7.2 1.4.65 2 1.2.55.5 1.05.8 1.6.8s1.05-.3 1.6-.8c.6-.55 1.3-1 2-1.2.75-.22 1.4-.55 1.4-1.15 0-.33-.25-.55-.75-.65-.72-.15-1.24-.55-1.55-1.2-.36-.75-.36-1.6-.36-3.1 0-2.2-.9-3.75-2.34-3.75s-2.34 1.55-2.34 3.75c0 1.5 0 2.35-.36 3.1-.3.65-.83 1.05-1.55 1.2-.5.1-.75.32-.75.65 0 .6.65.93 1.4 1.15Z"/>',
  ),
} as const;
