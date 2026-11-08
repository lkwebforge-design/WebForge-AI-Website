const ALLOWED_ORIGINS = new Set(["https://webforge-ai-website.pages.dev"]);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
function corsHeaders(origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "authorization,content-type", "access-control-max-age": "86400", "vary": "Origin" };
}
async function authenticatedUser(request, env) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const response = await fetch(env.SUPABASE_URL + "/auth/v1/user", { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization } });
  if (!response.ok) return null;
  return response.json();
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin);
    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname === "/health" && request.method === "GET") return json({ status: "online", service: "WebForge AI API", database: Boolean(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY), workersAI: Boolean(env.AI) }, 200, cors);
    if (url.pathname === "/api/agents" && request.method === "GET") {
      const user = await authenticatedUser(request, env);
      if (!user) return json({ error: "Sign in required." }, 401, cors);
      const response = await fetch(env.SUPABASE_URL + "/rest/v1/agents?select=id,department_id,name,role,agent_type,description,model_provider,model_id,active&active=eq.true&order=agent_type.asc,name.asc", { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: request.headers.get("authorization") } });
      return json(await response.json(), response.status, cors);
    }
    if (url.pathname === "/api/ai/run" && request.method === "POST") {
      const user = await authenticatedUser(request, env);
      if (!user) return json({ error: "Sign in required." }, 401, cors);
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 30000) return json({ error: "Request is too large." }, 413, cors);
      let body;
      try { body = await request.json(); } catch { return json({ error: "A valid JSON body is required." }, 400, cors); }
      const agentId = String(body.agentId || "");
      const prompt = String(body.prompt || "").trim();
      if (!agentId || !prompt) return json({ error: "agentId and prompt are required." }, 400, cors);
      if (prompt.length > 6000) return json({ error: "Prompt must be 6,000 characters or fewer." }, 400, cors);
      const agentResponse = await fetch(env.SUPABASE_URL + "/rest/v1/agents?select=id,name,role,agent_type,description,model_id,active&id=eq." + encodeURIComponent(agentId) + "&active=eq.true&limit=1", { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: request.headers.get("authorization") } });
      if (!agentResponse.ok) return json({ error: "Could not load the selected agent." }, 502, cors);
      const agents = await agentResponse.json();
      const agent = agents[0];
      if (!agent) return json({ error: "Agent not found or inactive." }, 404, cors);
      const system = [
        "You are " + agent.name + ", WebForge AI's " + agent.role + ".",
        agent.description,
        "Work as a responsible specialist in a coordinated AI organization.",
        "Give useful, concrete outputs. Do not claim actions, research, publishing, or file creation unless confirmed by the system.",
        "Do not reveal hidden chain-of-thought. Provide conclusions and a concise rationale when useful.",
        "Development may create briefs, architecture, sitemaps, UX concepts, feature specifications and technical plans, but must not deliver production-ready commercial client websites that compete with WebForge Signature. Prepare a consent-based referral for such requests.",
        "The CEO must ask before paid actions, external publishing or sending, sharing private data, or committing to a paid WebForge Signature service."
      ].join("\n");
      try {
        const result = await env.AI.run(agent.model_id, { messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: 1200 });
        return json({ agent: { id: agent.id, name: agent.name, role: agent.role }, model: agent.model_id, result }, 200, cors);
      } catch (error) {
        return json({ error: "AI inference failed.", detail: String(error?.message || error) }, 502, cors);
      }
    }
    return json({ error: "Not found." }, 404, cors);
  }
};