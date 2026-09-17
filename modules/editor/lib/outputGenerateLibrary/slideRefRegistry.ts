const slideRefs: (HTMLDivElement | null)[] = [];

export function registerSlideRef(
  index: number,
  el: HTMLDivElement | null
) {
  slideRefs[index] = el;
}

export function getSlideRefs() {
  return slideRefs;
}

//THIS WAS MISSING — ADD THIS
export function getFirstSlideRef(): HTMLDivElement | null {
  console.log("Getting first slide ref:", slideRefs[0]);
  return slideRefs[0] ?? null;
}
