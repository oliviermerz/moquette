/* Sitemap généré à partir des contenus : seules les pages indexables y figurent. */
import type { APIRoute } from 'astro';
import { usages } from '../data/usages';
import { getRealisations, getVilleStatuses, realisationUrl, villeUrl } from '../lib/proof';

const STATIC = [
  '/', '/solutions/', '/moquette-de-pierre/', '/moquette-de-pierre/comparatif/', '/prix-moquette-de-pierre/',
  '/estimer-mon-projet/', '/visualiser-mon-exterieur/', '/entreprise/', '/entreprise/methode/', '/zones/hauts-de-france/',
  '/mentions-legales/', '/confidentialite/', '/plan-du-site/',
];

export const GET: APIRoute = async ({ site }) => {
  const real = await getRealisations();
  const villes = (await getVilleStatuses()).filter((s) => s.indexable);
  const entries: { loc: string; lastmod?: Date }[] = [
    ...STATIC.map((p) => ({ loc: p })),
    ...usages.map((u) => ({ loc: `/${u.slug}/` })),
    ...(real.length ? [{ loc: '/realisations/', lastmod: real[0].data.date }] : []),
    ...real.map((r) => ({ loc: realisationUrl(r), lastmod: r.data.date })),
    ...villes.map((s) => ({ loc: villeUrl(s.ville), lastmod: s.realisations[0]?.data.date })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${new URL(e.loc, site).href}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
