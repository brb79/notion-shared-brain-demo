# Shared Brain Switchboard

Sandbox tech demo: a small board that reads three Notion databases (Context, Decisions, Handoffs) and shows which agent wrote what, plus a real handoff pickup.

The Notion sandbox page is [Agent Shared Brain (demo)](https://app.notion.com/p/422af6475d7981ab8d8dc2c286fd7041). It is separate from any live Agent Brain. Sample content only; no secrets.

## Data source

If `NOTION_TOKEN` is set in the environment, the board queries the three sandbox databases at request time and labels itself **Live from Notion**.

If no token is set, or the Notion request fails, the board serves `data/snapshot.json`, a static export of the seeded entries, and labels itself **Snapshot**.

Do not commit a token. If you want live data, create a Notion integration, share the demo page with it, and enter the token yourself in the Vercel project environment variables. Then redeploy a preview. Never use `vercel --prod` for this demo.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Preview only:

```bash
vercel deploy --target preview
```
