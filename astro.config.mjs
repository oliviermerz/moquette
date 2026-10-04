// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// URL de production (domaine à confirmer). Surcharger avec SITE_URL au build.
const SITE = process.env.SITE_URL || 'https://www.strate.fr';

const secret = (optional = true) => envField.string({ context: 'server', access: 'secret', optional });

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Pages statiques ; seule l'API /api/lead/ s'exécute côté serveur.
  // Vercel en production (variable VERCEL définie par la plateforme), serveur Node en local (npm start)
  adapter: process.env.VERCEL ? vercel({ maxDuration: 120 }) : node({ mode: 'standalone' }),
  // Sitemap : src/pages/sitemap.xml.ts (ne liste que les pages indexables)
  env: {
    schema: {
      BREVO_API_KEY: secret(),
      BREVO_API_URL: envField.string({ context: 'server', access: 'secret', default: 'https://api.brevo.com/v3' }),
      BREVO_ATTR_FIRSTNAME: envField.string({ context: 'server', access: 'secret', default: 'PRENOM' }),
      BREVO_ATTR_LASTNAME: envField.string({ context: 'server', access: 'secret', default: 'NOM' }),
      BREVO_LIST_LEADS: envField.number({ context: 'server', access: 'secret', optional: true }),
      BREVO_LIST_NEWSLETTER: envField.number({ context: 'server', access: 'secret', optional: true }),
      BREVO_PIPELINE_ID: secret(),
      BREVO_STAGE_NEW: secret(),
      BREVO_DEAL_OWNER: secret(),
      BREVO_TASK_TYPE_CALL: secret(),
      LEAD_SENDER_EMAIL: secret(),
      LEAD_SENDER_NAME: envField.string({ context: 'server', access: 'secret', default: 'STRATE' }),
      LEAD_REPLY_TO: secret(),
      TEAM_NOTIFY_EMAILS: secret(),
      TEAM_NOTIFY_SMS: secret(),
      SMS_SENDER: envField.string({ context: 'server', access: 'secret', default: 'STRATE' }),
      N8N_WEBHOOK_URL: secret(),
      GOOGLE_PLACES_API_KEY: secret(),
      GOOGLE_PLACE_ID: secret(),
      // Assistant conversationnel (Claude)
      ANTHROPIC_API_KEY: secret(),
      CHAT_MODEL: envField.string({ context: 'server', access: 'secret', default: 'claude-opus-5-5' }),
      CHAT_EFFORT: envField.enum({ context: 'server', access: 'secret', values: ['low', 'medium', 'high'], default: 'low' }),
      // STRATE Vision
      OPENAI_API_KEY: secret(),
      VISION_PROVIDER: envField.enum({ context: 'server', access: 'secret', values: ['openai', 'local'], optional: true }),
      VISION_MODEL: envField.string({ context: 'server', access: 'secret', default: 'gpt-image-2' }),
      VISION_QUALITY: envField.enum({ context: 'server', access: 'secret', values: ['low', 'medium', 'high'], default: 'medium' }),
    },
  },
});
