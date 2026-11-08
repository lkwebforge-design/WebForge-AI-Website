# WebForge AI API

Cloudflare Worker API for the WebForge AI website.

## Deployed service

- Health: https://webforge-ai-api.lkwebforge.workers.dev/health
- Agent registry: GET /api/agents (requires a valid Supabase access token)
- Agent inference: POST /api/ai/run (requires a valid Supabase access token)

## Runtime bindings

- `AI`: Cloudflare Workers AI binding
- `SUPABASE_URL`: dedicated WebForge AI Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY`: public publishable key only; never put a service-role key in this Worker or browser code

## AI routing

The selected agent's model ID is read from the private WebForge AI agent registry. Current model profiles use Cloudflare Workers AI models, including GLM-4.7-Flash for CEO/development/operations reasoning and Gemma 4 26B for content and research tasks. The Workers AI free allocation is shared across the Cloudflare account, not per agent.

## Security

- Validates Supabase access tokens through Supabase Auth before listing agents or running inference.
- Agent model IDs are read from the server-side registry, not accepted from browser input.
- CORS is restricted to the production WebForge AI Pages origin.
- No service-role key or provider secret is included in source.
- This first API milestone provides authenticated agent inference and registry access. Durable task orchestration, usage metering, credit settlement and deliverable storage are subsequent milestones.
