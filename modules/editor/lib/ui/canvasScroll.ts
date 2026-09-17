/**
 * Canvas ko kisi page tak scroll karne ka ek hi rasta.
 *
 * Zaroorat isliye padi ki page add/duplicate karne par store `activeSlide` to
 * naye page par set kar deta tha, par canvas wahin khada rehta tha — aur
 * canvas ka apna scroll→activeSlide sync turant activeSlide wapas us page par
 * le aata tha jo viewport ke center me hai. Nateeja: user page banata tha aur
 * purane page par hi type karta reh jaata tha.
 *
 * Isliye do cheezein saath chalti hain: scroll karo, aur us doraan sync ko
 * chup kara do — warna beech ke pages ke upar se guzarte hue activeSlide
 * badalta rehta hai aur scroll khud ko hi cancel kar deta hai.
 */

/** Editor canvas ka scroll container. */
const CANVAS_SCROLL_SELECTOR = ".kd-default-scroll-panel";

/**
 * Smooth scroll ~500ms me poora ho jaata hai; thoda margin rakha hai taaki
 * aakhri frame ka scroll event bhi is window me aa jaye.
 */
const SUPPRESS_MS = 700;

let suppressUntil = 0;

/** Kya abhi hamara apna scroll chal raha hai? */
export const isCanvasScrollSyncSuppressed = () => Date.now() < suppressUntil;

/** Programmatic scroll shuru — itni der scroll→activeSlide sync band. */
export const suppressCanvasScrollSync = (ms: number = SUPPRESS_MS) => {
  suppressUntil = Date.now() + ms;
};

/**
 * Page pehle se itna dikh raha ho to canvas ko hilana nahi hai. Element par
 * click karne se bhi activeSlide badalta hai — us par view khisak jaye to
 * editing me jhatka lagta hai.
 */
const ALREADY_VISIBLE_FRACTION = 0.6;

/**
 * Canvas ko `index` wale page par le jao — sirf tab jab wo page ab dikh hi
 * nahi raha.
 *
 * Isse React ke effect me hi, synchronously bulao. Naya page us waqt tak DOM
 * me aa chuka hota hai, aur suppression bhi usi tick me lag jaati hai — ek
 * frame ruk gaye to canvas ka apna sync beech me chal kar activeSlide wapas
 * purane page par le jaata hai.
 */
export function scrollCanvasToSlide(
  index: number,
  behavior: ScrollBehavior = "smooth",
) {
  if (typeof document === "undefined") return;

  const container = document.querySelector<HTMLElement>(CANVAS_SCROLL_SELECTOR);
  if (!container) return;

  const target =
    container.querySelectorAll<HTMLElement>("[data-slide-index]")[index];
  if (!target) return;

  const containerBox = container.getBoundingClientRect();
  const targetBox = target.getBoundingClientRect();

  const visible =
    Math.min(targetBox.bottom, containerBox.bottom) -
    Math.max(targetBox.top, containerBox.top);
  if (visible >= targetBox.height * ALREADY_VISIBLE_FRACTION) return;

  // Page ko beech me laate hain, sirf kinare tak nahi. Canvas active page
  // viewport ke center se tay karta hai, to adhoora scroll karne par sync
  // turant purane page par wapas chala jaata.
  const top =
    container.scrollTop +
    (targetBox.top - containerBox.top) -
    Math.max(0, (containerBox.height - targetBox.height) / 2);

  suppressCanvasScrollSync();
  container.scrollTo({ top: Math.max(0, top), behavior });
}
