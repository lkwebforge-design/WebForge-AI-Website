const SUPABASE_URL = "https://wuvynetonravvyguqezq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_n6BaeThGp7cYheFHAUDq5w_JMYaSw5x";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const toast = document.getElementById("toast");
let toastTimer;
function notify(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function statusGroup(status) {
  if (["under_review","submitted","revision_requested"].includes(status)) return "review";
  if (["in_progress","waiting_for_input"].includes(status)) return "progress";
  if (["assigned","created"].includes(status)) return "assigned";
  return "all";
}
function statusLabel(status) {
  return ({created:"Created",assigned:"Assigned",in_progress:"In progress",waiting_for_input:"Waiting for input",submitted:"Submitted",under_review:"Under review",revision_requested:"Revision requested",approved:"Approved",failed:"Failed",cancelled:"Cancelled"})[status] || status;
}
function dateLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric"});
}
function renderProjects(projects, tasks) {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;
  if (!projects.length) {
    grid.innerHTML = '<div class="deliverable-empty"><span>＋</span><b>No projects yet.</b><p>Tell your CEO what you want to achieve to start your first project.</p><a class="small-action" href="index.html#ceo-chat">Start with your CEO →</a></div>';
    return;
  }
  grid.innerHTML = projects.map(project => {
    const count = tasks.filter(task => task.project_id === project.id).length;
    const progress = Number(project.progress || 0);
    return '<article class="project-card"><div class="project-top"><span class="project-category green-cat">'+escapeHtml(project.status.toUpperCase())+'</span><span class="project-menu">W</span></div><h3>'+escapeHtml(project.name)+'</h3><p>'+escapeHtml(project.goal)+'</p><div class="project-progress"><div><small>Progress</small><b>'+progress+'%</b></div><span><i style="width:'+progress+'%"></i></span></div><div class="project-footer"><span class="project-owner"><i class="owner-dot business-dot"></i> CEO-led project</span><span>'+count+' tasks</span></div></article>';
  }).join("");
}
function renderTasks(tasks, projects, agents, departments) {
  const body = document.getElementById("taskRows");
  const foot = document.getElementById("taskFootnote");
  if (!body) return;
  const projectMap = Object.fromEntries(projects.map(project => [project.id, project.name]));
  const agentMap = Object.fromEntries(agents.map(agent => [agent.id, agent.name]));
  const deptMap = Object.fromEntries(departments.map(dept => [dept.id, dept.name]));
  if (!tasks.length) {
    body.innerHTML = '<tr><td colspan="5">No tasks yet. Your CEO will create tasks when project planning is connected.</td></tr>';
    if (foot) foot.textContent = "No task records yet.";
    return;
  }
  body.innerHTML = tasks.map(task => {
    const group = statusGroup(task.status);
    const dept = deptMap[task.department_id] || "General";
    const css = group === "review" ? "review-status" : group === "progress" ? "progress-status" : "assigned-status";
    return '<tr data-status="'+group+'"><td><b>'+escapeHtml(task.title)+'</b><small>'+escapeHtml(projectMap[task.project_id] || "Project")+'</small></td><td><span class="department-chip">'+escapeHtml(dept)+'</span></td><td>'+escapeHtml(agentMap[task.assigned_agent_id] || "CEO")+'</td><td><span class="task-status '+css+'">'+escapeHtml(statusLabel(task.status))+'</span></td><td>'+dateLabel(task.due_at)+'</td></tr>';
  }).join("");
  if (foot) foot.textContent = "Showing " + tasks.length + " live task records.";
}
function renderManagers(agents) {
  const grid = document.getElementById("managerGrid");
  if (!grid) return;
  const managers = agents.filter(agent => agent.agent_type === "manager");
  grid.innerHTML = managers.map(agent => '<div><i class="creative-bullet"></i><span><b>'+escapeHtml(agent.name)+'</b><small>'+escapeHtml(agent.role)+'</small></span></div>').join("");
}
function renderDepartments(departments, tasks) {
  const list = document.querySelector(".department-list");
  if (!list) return;
  list.innerHTML = departments.map((dept,index) => {
    const count = tasks.filter(task => task.department_id === dept.id).length;
    const width = Math.min(100, count * 18);
    return '<div><span class="dept-bullet"></span><span>'+escapeHtml(dept.name)+'</span><b>'+count+' tasks</b><div class="dept-track"><i style="width:'+width+'%"></i></div></div>';
  }).join("");
}
async function loadWorkspace(user) {
  const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Founder";
  const first = name.split(/[ ._-]/)[0];
  document.getElementById("dashGreeting").textContent = "Welcome back, " + first + ".";
  document.getElementById("accountName").textContent = name;
  document.getElementById("accountEmail").textContent = user.email || "Signed in";
  document.getElementById("userInitial").textContent = first.charAt(0).toUpperCase();
  document.querySelector(".sidebar-user .user-initial").textContent = first.charAt(0).toUpperCase();
  document.getElementById("workspaceBadge").innerHTML = "<i></i> LIVE WORKSPACE";
  document.getElementById("previewBannerTitle").textContent = "Your private workspace is connected.";
  document.getElementById("previewBannerText").textContent = "Projects and records below are loaded from your WebForge AI account. AI planning and task orchestration are being connected in stages.";
  document.getElementById("dashDate").textContent = new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"}).toUpperCase();

  const [projectsResult,tasksResult,agentsResult,departmentsResult,deliverablesResult] = await Promise.all([
    client.from("projects").select("id,name,goal,status,progress,created_at").order("created_at",{ascending:false}).limit(12),
    client.from("tasks").select("id,project_id,department_id,assigned_agent_id,title,status,priority,due_at,created_at").order("created_at",{ascending:false}).limit(30),
    client.from("agents").select("id,department_id,name,role,agent_type,description,model_id").eq("active",true),
    client.from("departments").select("id,name,description").order("name"),
    client.from("deliverables").select("id,title,description,file_type,status,created_at").order("created_at",{ascending:false}).limit(10)
  ]);
  for (const result of [projectsResult,tasksResult,agentsResult,departmentsResult,deliverablesResult]) {
    if (result.error) throw result.error;
  }
  const projects = projectsResult.data || [];
  const tasks = tasksResult.data || [];
  const agents = agentsResult.data || [];
  const departments = departmentsResult.data || [];
  const deliverables = deliverablesResult.data || [];
  const activeProjects = projects.filter(project => !["completed","archived","failed"].includes(project.status)).length;
  const openTasks = tasks.filter(task => !["approved","cancelled","failed"].includes(task.status)).length;
  const inReview = tasks.filter(task => ["submitted","under_review","revision_requested"].includes(task.status)).length;
  const approved = tasks.filter(task => task.status === "approved").length;
  document.getElementById("statProjects").textContent = String(activeProjects).padStart(2,"0");
  document.getElementById("statTasks").textContent = String(openTasks).padStart(2,"0");
  document.getElementById("statReview").textContent = String(inReview).padStart(2,"0");
  document.getElementById("statApproved").textContent = String(approved).padStart(2,"0");
  renderProjects(projects,tasks);
  renderTasks(tasks,projects,agents,departments);
  renderManagers(agents);
  renderDepartments(departments,tasks);
  const deliverableBox = document.getElementById("deliverablesContent");
  if (deliverableBox) {
    deliverableBox.innerHTML = deliverables.length
      ? deliverables.map(item => '<div class="snapshot-row"><span class="snapshot-icon">▤</span><span><b>'+escapeHtml(item.title)+'</b><small>'+escapeHtml(item.description || item.file_type)+'</small></span><em>'+escapeHtml(item.status)+'</em></div>').join("")
      : '<span>▤</span><b>No deliverables yet.</b><p>Reviewed reports, plans and files will appear here as the team completes work.</p>';
  }
  document.querySelector(".stat-grid article:nth-child(1) p").innerHTML = "<b>"+projects.length+"</b> total in your workspace";
  document.querySelector(".stat-grid article:nth-child(2) p").innerHTML = "Across <b>"+departments.length+"</b> departments";
  document.querySelector(".stat-grid article:nth-child(3) p").textContent = "Awaiting review";
  document.querySelector(".stat-grid article:nth-child(4) p").textContent = "Ready for delivery";
}

const sign = document.getElementById("dashSignIn");
if (sign) sign.addEventListener("click", async () => {
  const {data} = await client.auth.getSession();
  if (!data.session) return location.href = "auth.html";
  await client.auth.signOut();
  location.href = "index.html";
});
const dismiss = document.getElementById("dismissBanner");
if (dismiss) dismiss.addEventListener("click", () => {
  const banner = dismiss.closest(".preview-banner");
  if (banner) banner.remove();
});
document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
  const filter = button.dataset.filter;
  document.querySelectorAll("#taskRows tr").forEach(row => row.classList.toggle("hidden", filter !== "all" && row.dataset.status !== filter));
}));
document.querySelectorAll(".sidebar-nav a[href^='#']").forEach(link => link.addEventListener("click", () => {
  document.querySelectorAll(".sidebar-nav a").forEach(item => item.classList.remove("active"));
  link.classList.add("active");
}));
(async () => {
  const {data,error} = await client.auth.getSession();
  if (error) return notify(error.message);
  const session = data.session;
  if (!session) {
    if (sign) sign.innerHTML = 'Sign in <span>↗</span>';
    return;
  }
  if (sign) sign.textContent = "Sign out";
  try { await loadWorkspace(session.user); }
  catch (error) { notify("Workspace could not load: " + error.message); }
})();
