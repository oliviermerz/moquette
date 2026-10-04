/**
 * Avis Google via l'API Places (New), lus au moment du build.
 * Sans GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID, renvoie null et le site affiche les avis saisis à la main (ou rien).
 * L'API renvoie au plus quelques avis, sélectionnés par Google : nous les affichons tels quels, sans tri.
 */
import { GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID } from 'astro:env/server';

export interface Review {
  author: string;
  authorUrl?: string;
  rating: number;
  text: string;
  date: Date;
  url?: string;
  ville?: string;
}
export interface GooglePlaceReviews { rating: number | null; count: number; mapsUrl: string | null; reviews: Review[] }

let cache: Promise<GooglePlaceReviews | null> | undefined;

export function getGoogleReviews(): Promise<GooglePlaceReviews | null> {
  cache ??= load();
  return cache;
}

async function load(): Promise<GooglePlaceReviews | null> {
  if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(GOOGLE_PLACE_ID)}?languageCode=fr`, {
      headers: { 'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
    const d = (await res.json()) as {
      rating?: number; userRatingCount?: number; googleMapsUri?: string;
      reviews?: { rating: number; text?: { text: string }; originalText?: { text: string }; publishTime: string; authorAttribution?: { displayName?: string; uri?: string } }[];
    };
    return {
      rating: d.rating ?? null,
      count: d.userRatingCount ?? 0,
      mapsUrl: d.googleMapsUri ?? null,
      reviews: (d.reviews ?? [])
        .filter((r) => (r.originalText?.text ?? r.text?.text ?? '').trim())
        .map((r) => ({
          author: r.authorAttribution?.displayName ?? 'Client Google',
          authorUrl: r.authorAttribution?.uri,
          rating: r.rating,
          text: (r.originalText?.text ?? r.text?.text ?? '').trim(),
          date: new Date(r.publishTime),
        })),
    };
  } catch (e) {
    console.warn('[avis] Avis Google indisponibles :', (e as Error).message);
    return null;
  }
}
