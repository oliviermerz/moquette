/**
 * STRATE Vision : génération d'une simulation de sol en pierre naturelle résinée sur la photo d'un client.
 *
 * - Fournisseur « openai » : modèle d'édition d'image avec masque (GPT Image, configurable).
 * - Fournisseur « local » : texture procédurale, pour le développement et les tests (aucun appel externe).
 * Dans tous les cas, la photo d'origine est recollée hors de la zone tracée : seul le sol change,
 * puis la mention « Simulation visuelle non contractuelle » est incrustée.
 */
import sharp from 'sharp';
import { OPENAI_API_KEY, VISION_PROVIDER, VISION_MODEL, VISION_QUALITY } from 'astro:env/server';

export const FINISH_PROMPTS: Record<string, { label: string; prompt: string; tones: string[] }> = {
  beige: { label: 'Beige naturel', prompt: 'warm natural beige: a mix of cream, sand and honey-coloured rounded marble pebbles', tones: ['#d8c7a6', '#cbb48d', '#e3d5bb', '#b99d74', '#efe4cf'] },
  blanc: { label: 'Blanc minéral', prompt: 'bright mineral white: white and very pale grey rounded marble pebbles', tones: ['#f1efea', '#e4e0d8', '#d6d2c9', '#faf9f6', '#c9c4ba'] },
  gris: { label: 'Gris contemporain', prompt: 'contemporary grey: mid-grey, light grey and a few charcoal rounded pebbles', tones: ['#9a9a96', '#7d7e7b', '#b4b3ae', '#5f605d', '#c8c7c2'] },
  mix: { label: 'Mix pierre', prompt: 'natural stone mix: beige, grey, white and a few dark rounded pebbles blended together', tones: ['#d8c7a6', '#9a9a96', '#efe4cf', '#6f6a63', '#c9c4ba'] },
};

export function visionProvider(): 'openai' | 'local' | null {
  if (VISION_PROVIDER === 'local') return 'local';
  if (OPENAI_API_KEY) return 'openai';
  return null;
}

function buildPrompt(finish: string) {
  const f = FINISH_PROMPTS[finish] ?? FINISH_PROMPTS.beige;
  return [
    'Photorealistic exterior renovation of this exact photo.',
    'Inside the transparent area of the mask only, replace the existing ground surface with a resin-bound natural stone carpet ("moquette de pierre"):',
    'a seamless, joint-free surface of small rounded pebbles about 3 to 4 mm, tightly packed and bound with clear resin, slightly textured, matte finish.',
    `Colour: ${f.prompt}.`,
    'Follow exactly the perspective, slope, edges and borders of the original ground. Keep a realistic scale: individual pebbles are barely distinguishable from a few metres away.',
    'Keep the existing light direction, shadows and reflections consistent with the scene.',
    'Do not change walls, doors, windows, furniture, plants, pools, people or anything outside the ground. No text, no logo, no watermark.',
  ].join(' ');
}

async function renderOpenAI(photo: Buffer, mask: Buffer, w: number, h: number, finish: string): Promise<Buffer> {
  const model = VISION_MODEL;
  const fd = new FormData();
  fd.append('model', model);
  fd.append('prompt', buildPrompt(finish));
  fd.append('image', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'photo.jpg');
  fd.append('mask', new Blob([new Uint8Array(mask)], { type: 'image/png' }), 'mask.png');
  // GPT Image 2 accepte des dimensions libres (multiples de 16) ; les modèles plus anciens, des formats fixes
  fd.append('size', model.startsWith('gpt-image-1') || w / h > 3 || h / w > 3 ? 'auto' : `${w}x${h}`);
  fd.append('quality', VISION_QUALITY);
  fd.append('output_format', 'jpeg');
  fd.append('n', '1');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: fd,
    signal: AbortSignal.timeout(150_000),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: { b64_json?: string }[]; error?: { message?: string } };
  if (!res.ok || !body.data?.[0]?.b64_json) throw new Error(`OpenAI ${res.status} ${body.error?.message ?? ''}`.trim());
  return Buffer.from(body.data[0].b64_json, 'base64');
}

/** Texture procédurale de granulats (fournisseur « local ») */
async function renderLocal(photo: Buffer, w: number, h: number, finish: string): Promise<Buffer> {
  const tones = (FINISH_PROMPTS[finish] ?? FINISH_PROMPTS.beige).tones;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cell = 9;
  const dots: string[] = [];
  for (let y = 0; y < h; y += cell * 0.8) for (let x = 0; x < w; x += cell * 0.8) {
    const r = cell * (0.38 + rnd() * 0.25);
    dots.push(`<ellipse cx="${(x + rnd() * cell).toFixed(1)}" cy="${(y + rnd() * cell).toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * (0.65 + rnd() * 0.3)).toFixed(1)}" fill="${tones[Math.floor(rnd() * tones.length)]}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#4f4535"/>${dots.join('')}</svg>`;
  const texture = await sharp(Buffer.from(svg)).png().toBuffer();
  // Conserve les ombres de la photo d'origine
  const shade = await sharp(photo).resize(w, h).grayscale().linear(0.6, 100).toBuffer();
  return sharp(texture).composite([{ input: shade, blend: 'multiply' }]).jpeg().toBuffer();
}

function watermarkSvg(w: number, h: number) {
  const fs = Math.max(14, Math.round(w / 70));
  const text = 'STRATE · Simulation visuelle non contractuelle';
  const tw = Math.round(text.length * fs * 0.56);
  const pad = Math.round(fs * 0.6);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="${w - tw - pad * 3}" y="${h - fs - pad * 3}" width="${tw + pad * 2}" height="${fs + pad * 2}" fill="rgba(20,21,19,0.6)"/>
    <text x="${w - tw - pad * 2}" y="${h - pad * 2 - Math.round(fs * 0.15)}" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" fill="#ffffff">${text}</text>
  </svg>`);
}

export interface VisionResult { jpeg: Buffer; provider: 'openai' | 'local' }

export async function renderVision(photo: Buffer, mask: Buffer, finish: string): Promise<VisionResult> {
  const provider = visionProvider();
  if (!provider) throw new Error('vision_non_configuree');
  const meta = await sharp(photo).metadata();
  const w = meta.width!, h = meta.height!;
  const raw = provider === 'openai' ? await renderOpenAI(photo, mask, w, h, finish) : await renderLocal(photo, w, h, finish);

  // Zone modifiable = pixels transparents du masque. Bord adouci de quelques pixels.
  const editable = await sharp(mask).resize(w, h).ensureAlpha().extractChannel(3).negate().blur(1.5).toColourspace('b-w').png().toBuffer();
  // Deux étapes : dans un même pipeline sharp, removeAlpha() s'exécuterait après joinChannel()
  const renderRgb = await sharp(raw).resize(w, h, { fit: 'fill' }).removeAlpha().toBuffer();
  const renderMasked = await sharp(renderRgb).joinChannel(editable).png().toBuffer();
  const jpeg = await sharp(photo)
    .composite([{ input: renderMasked }, { input: watermarkSvg(w, h) }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  return { jpeg, provider };
}
