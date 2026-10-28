import { apiFetch } from "@shared/apiFetch";
/**
 * Asset library endpoints ke liye ek chhota in-flight + result cache.
 *
 * Elements, text templates, background images — ye teeno ek hi list hain jo
 * poore session me nahi badalti, par panel band karke kholte hi dobara fetch
 * ho jaati thi. `/api/elements` akela 300 KB hai. Yahan promise cache hoti hai,
 * to ek hi request jaati hai chahe do panel ek saath maangein.
 *
 * Failure cache nahi hoti — error par entry hata di jaati hai, taaki "Try
 * again" sach me dobara koshish kare.
 */

const cache = new Map<string, Promise<unknown>>();

export function fetchLibrary<T>(url: string, load?: () => Promise<T>): Promise<T> {
  const existing = cache.get(url) as Promise<T> | undefined;
  if (existing) return existing;

  const request = (load ? load() : defaultLoad<T>(url)).catch((error) => {
    cache.delete(url);
    throw error;
  });

  cache.set(url, request);
  return request;
}

/** Us endpoint ko agli baar dobara fetch karne do. */
export function invalidateLibrary(url: string) {
  cache.delete(url);
}

async function defaultLoad<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}
