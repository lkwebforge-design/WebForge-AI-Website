const SUPABASE_URL = "https://wuvynetonravvyguqezq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_n6BaeThGp7cYheFHAUDq5w_JMYaSw5x";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.webforgeAuth = {
  client,
  async getSession() {
    const { data } = await client.auth.getSession();
    return data.session;
  }
};
const form = document.getElementById("authForm");
const title = document.getElementById("authTitle");
const description = document.getElementById("authDescription");
const submit = document.getElementById("authSubmit");
const status = document.getElementById("authStatus");
const signInTab = document.getElementById("signInTab");
const signUpTab = document.getElementById("signUpTab");
const nameLabel = document.getElementById("nameLabel");
const forgot = document.getElementById("forgotPassword");
const resetForm = document.getElementById("resetForm");
let mode = "signin";
function showStatus(message, success = false) {
  status.textContent = message;
  status.classList.toggle("success", success);
}
function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  signInTab.classList.toggle("active", !signup);
  signUpTab.classList.toggle("active", signup);
  nameLabel.classList.toggle("hidden", !signup);
  title.textContent = signup ? "Create your workspace." : "Welcome back.";
  description.textContent = signup ? "Create your private WebForge AI account to get started." : "Sign in to continue to your WebForge AI workspace.";
  submit.innerHTML = signup ? "Create account <span>→</span>" : "Sign in <span>→</span>";
  forgot.classList.toggle("hidden", signup);
  document.getElementById("password").autocomplete = signup ? "new-password" : "current-password";
  showStatus("");
}
function goToWorkspace() {
  const next = new URLSearchParams(location.search).get("next");
  location.replace(next === "dashboard.html" ? "dashboard.html" : "dashboard.html");
}
signInTab.addEventListener("click", () => setMode("signin"));
signUpTab.addEventListener("click", () => setMode("signup"));
form.addEventListener("submit", async event => {
  event.preventDefault();
  submit.disabled = true;
  showStatus(mode === "signup" ? "Creating your account…" : "Signing you in…");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  try {
    let result;
    if (mode === "signup") {
      const displayName = document.getElementById("displayName").value.trim();
      result = await client.auth.signUp({
        email, password,
        options: { data: { display_name: displayName }, emailRedirectTo: location.origin + "/index.html" }
      });
      if (!result.error && !result.data.session) {
        showStatus("Account created. Check your email to confirm your address.", true);
        return;
      }
    } else {
      result = await client.auth.signInWithPassword({ email, password });
    }
    if (result.error) throw result.error;
    showStatus("You're signed in. Opening your workspace…", true);
    goToWorkspace();
  } catch (error) {
    showStatus(error.message || "Something went wrong. Please try again.");
  } finally {
    submit.disabled = false;
  }
});
forgot.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return showStatus("Enter your email address first.");
  forgot.disabled = true;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/auth.html?reset=1" });
  forgot.disabled = false;
  showStatus(error ? error.message : "Password reset email sent. Check your inbox.", !error);
});
resetForm.addEventListener("submit", async event => {
  event.preventDefault();
  const password = document.getElementById("newPassword").value;
  const confirmation = document.getElementById("confirmPassword").value;
  if (password !== confirmation) return showStatus("Those passwords do not match.");
  const button = resetForm.querySelector("button");
  button.disabled = true;
  showStatus("Updating your password…");
  const { error } = await client.auth.updateUser({ password });
  button.disabled = false;
  if (error) return showStatus(error.message);
  showStatus("Password updated successfully. Opening your workspace…", true);
  setTimeout(() => goToWorkspace(), 700);
});
client.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    form.classList.add("hidden");
    signInTab.classList.add("hidden");
    signUpTab.classList.add("hidden");
    forgot.classList.add("hidden");
    resetForm.classList.remove("hidden");
    title.textContent = "Choose a new password.";
    description.textContent = "Set a new password for your WebForge AI account.";
    showStatus("");
  }
});
(async () => {
  const { data } = await client.auth.getSession();
  if (data.session && !new URLSearchParams(location.search).has("reset")) {
    showStatus("You're already signed in. Opening your workspace…", true);
    goToWorkspace();
  }
})();