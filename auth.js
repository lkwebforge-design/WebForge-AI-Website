const SUPABASE_URL = "https://wuvynetonravvyguqezq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_n6BaeThGp7cYheFHAUDq5w_JMYaSw5x";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.webforgeAuth = {
  client,
  async getSession() { const { data } = await client.auth.getSession(); return data.session; }
};
if (document.getElementById("authForm")) {
const $ = id => document.getElementById(id);
const form = $("authForm"), phoneForm = $("phoneForm"), title = $("authTitle"), description = $("authDescription");
const submit = $("authSubmit"), status = $("authStatus"), signInTab = $("signInTab"), signUpTab = $("signUpTab");
const nameLabel = $("nameLabel"), forgot = $("forgotPassword"), resetForm = $("resetForm");
let mode = "signin", method = "email", phoneStep = "send", pendingPhone = "";
function showStatus(message, success = false) {
  status.textContent = message; status.classList.toggle("success", success);
}
function setMode(next) {
  mode = next; const signup = mode === "signup";
  signInTab.classList.toggle("active", !signup); signUpTab.classList.toggle("active", signup);
  nameLabel.classList.toggle("hidden", !signup);
  title.textContent = signup ? "Create your workspace." : "Welcome to WebForge AI.";
  description.textContent = signup ? "Create your private account and start building with your AI company." : "Sign in to your workspace and put your AI company to work.";
  submit.innerHTML = signup ? "Create account <span>→</span>" : "Sign in <span>→</span>";
  forgot.classList.toggle("hidden", signup || method !== "email");
  $("password").autocomplete = signup ? "new-password" : "current-password";
  showStatus("");
}
function goToWorkspace() { location.replace("dashboard.html"); }
function setMethod(next) {
  method = next;
  $("emailMethod").classList.toggle("active", next === "email");
  $("phoneMethod").classList.toggle("active", next === "phone");
  $("socialAuth").classList.toggle("hidden", next === "phone");
  $("auth-divider").classList.toggle("hidden", next === "phone");
  form.classList.toggle("hidden", next !== "email");
  phoneForm.classList.toggle("hidden", next !== "phone");
  $("auth-tabs").classList.toggle("hidden", next !== "email");
  forgot.classList.toggle("hidden", next !== "email" || mode === "signup");
  showStatus("");
}
async function socialSignIn(provider) {
  showStatus("Connecting securely to " + (provider === "google" ? "Google" : "GitHub") + "…");
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: location.origin + "/auth.html?oauth=1" }
  });
  if (error) {
    const message = String(error.message || "");
    if (/unsupported provider|provider is not enabled/i.test(message)) {
      showStatus("Google sign-in isn't enabled in this WebForge AI project yet. Use email sign-in for now, or ask the administrator to finish Google OAuth setup in Supabase.");
    } else {
      showStatus(message || "Could not start sign-in. Check the provider configuration.");
    }
  }
}
$("googleSignIn").addEventListener("click", () => socialSignIn("google"));
$("emailMethod").addEventListener("click", () => setMethod("email"));
$("phoneMethod").addEventListener("click", () => setMethod("phone"));
signInTab.addEventListener("click", () => setMode("signin"));
signUpTab.addEventListener("click", () => setMode("signup"));
form.addEventListener("submit", async event => {
  event.preventDefault(); submit.disabled = true;
  showStatus(mode === "signup" ? "Creating your account…" : "Signing you in…");
  const email = $("email").value.trim(), password = $("password").value;
  try {
    let result;
    if (mode === "signup") {
      result = await client.auth.signUp({ email, password, options: { data: { display_name: $("displayName").value.trim() }, emailRedirectTo: location.origin + "/auth.html" } });
      if (!result.error && !result.data.session) { showStatus("Account created. Check your email to confirm your address.", true); return; }
    } else result = await client.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    showStatus("You're signed in. Opening your workspace…", true); goToWorkspace();
  } catch (error) { showStatus(error.message || "Something went wrong. Please try again."); }
  finally { submit.disabled = false; }
});
phoneForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("phoneSubmit"); button.disabled = true;
  try {
    if (phoneStep === "send") {
      pendingPhone = $("phoneNumber").value.trim();
      if (!/^\+[1-9]\d{7,14}$/.test(pendingPhone.replace(/[\s()-]/g, ""))) throw new Error("Enter your number with country code, for example +94771234567.");
      pendingPhone = pendingPhone.replace(/[\s()-]/g, "");
      showStatus("Sending your verification code…");
      const { error } = await client.auth.signInWithOtp({ phone: pendingPhone });
      if (error) throw error;
      phoneStep = "verify"; $("otpField").classList.remove("hidden");
      $("phoneNumber").readOnly = true; button.innerHTML = "Verify and sign in <span>→</span>";
      showStatus("Verification code sent. Enter it below.", true);
    } else {
      const token = $("phoneOtp").value.trim();
      if (!token) throw new Error("Enter the verification code.");
      showStatus("Verifying your number…");
      const { error } = await client.auth.verifyOtp({ phone: pendingPhone, token, type: "sms" });
      if (error) throw error;
      showStatus("Phone verified. Opening your workspace…", true); goToWorkspace();
    }
  } catch (error) { showStatus(error.message || "Phone verification failed."); }
  finally { button.disabled = false; }
});
forgot.addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return showStatus("Enter your email address first.");
  forgot.disabled = true;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/auth.html?reset=1" });
  forgot.disabled = false;
  showStatus(error ? error.message : "Password reset email sent. Check your inbox.", !error);
});
resetForm.addEventListener("submit", async event => {
  event.preventDefault();
  const password = $("newPassword").value, confirmation = $("confirmPassword").value;
  if (password !== confirmation) return showStatus("Those passwords do not match.");
  const button = resetForm.querySelector("button"); button.disabled = true; showStatus("Updating your password…");
  const { error } = await client.auth.updateUser({ password });
  button.disabled = false;
  if (error) return showStatus(error.message);
  showStatus("Password updated. Opening your workspace…", true); setTimeout(goToWorkspace, 700);
});
client.auth.onAuthStateChange(event => {
  if (event === "PASSWORD_RECOVERY") {
    form.classList.add("hidden"); $("socialAuth").classList.add("hidden");
    $("emailMethod").classList.add("hidden"); $("phoneMethod").classList.add("hidden");
    $("auth-divider").classList.add("hidden"); $("auth-tabs").classList.add("hidden");
    forgot.classList.add("hidden"); resetForm.classList.remove("hidden");
    title.textContent = "Choose a new password."; description.textContent = "Set a new password for your WebForge AI account."; showStatus("");
  }
});
(async () => {
  const { data } = await client.auth.getSession();
  if (data.session && !new URLSearchParams(location.search).has("reset")) goToWorkspace();
})();

}
