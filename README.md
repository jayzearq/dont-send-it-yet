# Don't Send It Yet

A closed-loop MVP for emotional texting moments.

## Run

```bash
node server.js
```

Open `http://localhost:4173`.

If `npm` is available, `npm run dev` does the same thing.

## Closed Loops

- Regret Score: paste a draft, get risk scoring, emotional diagnosis, and next action.
- Cooldown: start a 10-minute pause, answer reflection prompts, then choose a final outcome.
- Vault: save unsent messages with score, urge, and reflection.
- No-contact challenge: schedule Day 0, 1, 3, 7, 14, 21, and 30 emails.
- Daily check-in: update streak, log triggers, and queue an SOS email when urge is high.
- Feedback: after a decision, ask whether the pause helped, what made it hard, and what support would help next.

## Email Delivery

Without email credentials, messages are written to the local outbox and marked `mock_sent` when due.

To send real email through Resend:

```bash
RESEND_API_KEY=your_key FROM_EMAIL="Don't Send It Yet <hello@example.com>" npm run dev
```

Runtime data is saved in `data/db.json`.

## Admin Input Export

User drafts and notes are sensitive. The admin export endpoint is disabled unless `ADMIN_TOKEN` is set.

```bash
ADMIN_TOKEN=replace_me node server.js
```

Then fetch recent stored inputs:

```bash
curl -H "Authorization: Bearer replace_me" \
  https://dont-send-it-yet.onrender.com/api/admin/inputs
```

The export includes recent score drafts, vault saves, check-in notes, and feedback notes.

## SEO Setup

Set the public URL before production deploy so canonical links, Open Graph URLs,
`robots.txt`, and `sitemap.xml` use the real domain:

```bash
SITE_URL=https://your-final-domain.com npm run dev
```

After launch:

1. Submit `/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
2. Inspect the homepage URL in Google Search Console.
3. Validate structured data with Google's Rich Results Test.
4. Follow the first-month rollout in `SEO_PROMOTION_PLAN.md`.

## Deploy

This MVP is configured for Render using `render.yaml`.

Why Render:

- The app is a long-running Node web service, not a static site.
- It writes challenge, vault, feedback, and email outbox data to the filesystem.
- Render supports persistent disks for paid web services.

Render setup:

1. Push this repository to GitHub.
2. Create or sign in to a Render account.
3. Create a new Blueprint from the GitHub repository.
4. Render will read `render.yaml` and create the `dont-send-it-yet` web service.
5. Keep `DATA_DIR=/var/data`; this points to the persistent disk.
6. Add `RESEND_API_KEY` and `FROM_EMAIL` if you want real emails instead of local mock outbox.

Health check:

```bash
curl https://YOUR-RENDER-SERVICE.onrender.com/healthz
```

The service will also be available at Render's `onrender.com` subdomain until a custom domain is connected.
