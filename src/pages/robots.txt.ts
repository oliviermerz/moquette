import type { APIRoute } from 'astro';

/* En préproduction (PUBLIC_NOINDEX=true), tout le site est fermé aux robots. */
export const GET: APIRoute = ({ site }) => {
  const closed = import.meta.env.PUBLIC_NOINDEX === 'true';
  const body = closed
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
