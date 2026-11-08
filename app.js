const API_BASE = "https://webforge-ai-api.lkwebforge.workers.dev";
const toast = document.getElementById("toast");
let toastTimer;
function notify(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
const menu = document.getElementById("mobileMenu");
const nav = document.getElementById("mainNav");
if (menu && nav) {
  menu.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }));
}
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const messages = document.getElementById("chatMessages");
const sendButton = chatForm?.querySelector('button[type="submit"]');

function addMessage(role, content, label) {
  const row = document.createElement("div");
  row.className = role === "user" ? "user-message" : "message-row";
  if (role === "user") {
    row.textContent = content;
  } else {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.textContent = "W";
    const body = document.createElement("div");
    body.className = "message-content";
    const heading = document.createElement("small");
    heading.textContent = label || "WEBFORGE AI · CEO";
    const paragraph = document.createElement("p");
    paragraph.style.whiteSpace = "pre-wrap";
    paragraph.textContent = content;
    body.append(heading, paragraph);
    row.append(avatar, body);
  }
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

async function submitGoal(goal) {
  if (!messages || !goal) return;
  const auth = window.webforgeAuth;
  const session = auth ? await auth.getSession() : null;
  if (!session) {
    addMessage("user", goal);
    const prompt = document.createElement("div");
    prompt.className = "demo-answer";
    prompt.innerHTML = '<small>ACCOUNT REQUIRED</small><h3>Sign in to speak with your CEO.</h3><p>Your goal will be sent to the live WebForge AI CEO after you sign in.</p><a class="plain-link" href="auth.html">Sign in or create your account →</a>';
    messages.appendChild(prompt);
    messages.scrollTop = messages.scrollHeight;
    return;
  }

  addMessage("user", goal);
  const loading = addMessage("assistant", "Reviewing your goal and preparing a response…", "WEBFORGE AI · CEO");
  if (sendButton) sendButton.disabled = true;
  try {
    const response = await fetch(API_BASE + "/api/ai/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": "Bearer " + session.access_token
      },
      body: JSON.stringify({ agentId: "ceo", prompt: goal })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The CEO could not complete this request.");
    const result = payload.result;
    const answer = typeof result === "string"
      ? result
      : result?.response || result?.output_text || result?.text || JSON.stringify(result, null, 2);
    loading.querySelector(".message-content p").textContent = answer;
    loading.querySelector(".message-content small").textContent = "WEBFORGE AI · " + (payload.agent?.name || "CEO") + " · " + (payload.model || "CLOUDFLARE WORKERS AI");
    const note = document.createElement("div");
    note.className = "chat-disclaimer";
    note.textContent = "Live AI response. The full autonomous project workflow and deliverable execution are being added in the next build phase.";
    messages.appendChild(note);
  } catch (error) {
    loading.querySelector(".message-content p").textContent = error.message || "Something went wrong. Please try again.";
    loading.querySelector(".message-content small").textContent = "WEBFORGE AI · CONNECTION NOTICE";
  } finally {
    if (sendButton) sendButton.disabled = false;
    messages.scrollTop = messages.scrollHeight;
  }
}

if (chatForm) {
  chatForm.addEventListener("submit", async event => {
    event.preventDefault();
    const goal = chatInput.value.trim();
    if (!goal) { chatInput.focus(); return; }
    chatInput.value = "";
    await submitGoal(goal);
  });
}
document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    const goal = button.dataset.prompt;
    if (chatInput) chatInput.value = goal;
    submitGoal(goal);
  });
});
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener("click", event => {
  const target = document.querySelector(link.getAttribute("href"));
  if (target) {
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", link.getAttribute("href"));
  }
}));
(async () => {
  const signIn = document.getElementById("signInLater");
  if (!signIn || !window.webforgeAuth) return;
  const session = await window.webforgeAuth.getSession();
  if (session) {
    signIn.href = "dashboard.html";
    signIn.innerHTML = "My workspace <span>↗</span>";
  }
})();
