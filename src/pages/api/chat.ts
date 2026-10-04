/**
 * POST /api/chat/ : assistant conversationnel, réponse en flux (Server-Sent Events).
 *
 * Le navigateur envoie l'historique texte de la conversation (le serveur ne garde rien).
 * Dans un même tour, le serveur fait tourner la boucle d'outils (zone, budget, enregistrement)
 * et transmet le texte au fur et à mesure.
 * Événements SSE : delta {text} · tool {label} · lead {} · done {} · error {message}
 */
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'astro/zod';
import { ANTHROPIC_API_KEY, CHAT_MODEL, CHAT_EFFORT } from 'astro:env/server';
import { SYSTEM_PROMPT } from '../../lib/chat/knowledge';
import { TOOLS, TOOL_LABELS, runTool } from '../../lib/chat/tools';

export const prerender = false;

const MAX_TURNS = 30; // messages conservés dans l'historique
const MAX_CHARS = 1500; // par message visiteur
const MAX_TOOL_ROUNDS = 4; // appels d'outils par tour

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(6000) })).min(1).max(80),
  attribution: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  page: z.string().max(300).optional(),
  leadRecorded: z.boolean().optional(),
});

/* Limite : 30 messages par IP et par heure */
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 30;
}

let client: Anthropic | null = null;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: 'assistant_indisponible' }), { status: 503, headers: { 'content-type': 'application/json' } });
  if (limited(clientAddress ?? 'unknown')) return new Response(JSON.stringify({ error: 'trop_de_messages' }), { status: 429, headers: { 'content-type': 'application/json' } });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await request.json()); } catch { return new Response(JSON.stringify({ error: 'requete_invalide' }), { status: 400 }); }

  // Historique nettoyé : alternance garantie, premier message utilisateur, longueurs bornées
  const history = body.messages.slice(-MAX_TURNS);
  while (history.length && history[0].role !== 'user') history.shift();
  const last = history.at(-1);
  if (!last || last.role !== 'user' || !last.content.trim()) return new Response(JSON.stringify({ error: 'requete_invalide' }), { status: 400 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history) {
    const content = (m.role === 'user' ? m.content.slice(0, MAX_CHARS) : m.content).trim();
    if (!content) continue;
    const prev = messages.at(-1);
    if (prev && prev.role === m.role && typeof prev.content === 'string') prev.content += `\n\n${content}`;
    else messages.push({ role: m.role, content });
  }
  const transcript = history.map((m) => `${m.role === 'user' ? 'Visiteur' : 'Assistant'} : ${m.content}`).join('\n');

  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      let leads = body.leadRecorded ? 1 : 0;
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const s = client!.beta.messages.stream({
            model: CHAT_MODEL,
            max_tokens: 4096,
            output_config: { effort: CHAT_EFFORT as 'low' | 'medium' | 'high' },
            // Repli automatique sur un autre modèle si une réponse est refusée par les garde-fous
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } }],
            tools: TOOLS,
            messages,
          });
          s.on('text', (delta) => send('delta', { text: delta }));
          const msg = await s.finalMessage();

          if (msg.stop_reason === 'refusal') { send('delta', { text: "Je ne peux pas répondre à cette demande. Puis-je vous aider sur votre projet d'extérieur ?" }); break; }
          const toolUses = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
          // Une entrée d'outil tronquée ne doit jamais être exécutée
          if (msg.stop_reason === 'max_tokens' && toolUses.length) { send('delta', { text: ' (réponse interrompue, pouvez-vous reformuler ?)' }); break; }
          if (msg.stop_reason !== 'tool_use' || toolUses.length === 0) break;
          if (round === MAX_TOOL_ROUNDS) { send('delta', { text: 'Je préfère laisser un conseiller vous répondre précisément : vous pouvez estimer votre projet sur /estimer-mon-projet/.' }); break; }

          messages.push({ role: 'assistant', content: msg.content });
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const t of toolUses) {
            send('tool', { label: TOOL_LABELS[t.name] ?? 'Un instant…' });
            const r = await runTool(t.name, t.input, { transcript, attribution: body.attribution, page: body.page, leadsThisSession: leads });
            if (r.leadRecorded) { leads++; send('lead', {}); }
            results.push({ type: 'tool_result', tool_use_id: t.id, content: r.content, ...(r.isError ? { is_error: true } : {}) });
          }
          messages.push({ role: 'user', content: results });
        }
        send('done', {});
      } catch (err) {
        console.error('[chat]', err);
        const message = err instanceof Anthropic.RateLimitError
          ? "L'assistant est très sollicité. Réessayez dans un instant."
          : "L'assistant est momentanément indisponible. Vous pouvez estimer votre projet sur /estimer-mon-projet/.";
        send('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' },
  });
};
