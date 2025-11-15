const baseURL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("jwt");
if (!token) location.href = "index.html";

function showLoading() {
    const loader = document.getElementById("loading-screen");
    loader.style.display = "flex";
    loader.style.opacity = 1;
}

function hideLoading() {
    const loader = document.getElementById("loading-screen");
    loader.style.opacity = 0;
    setTimeout(() => loader.style.display = "none", 300); 
}

function parseJwt(t){
  try{
    const b = t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(atob(b).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  }catch(e){return null;}
}
const me = parseJwt(token);
document.getElementById("whoami").innerText = me?.email || 'Invité';
document.getElementById("btn-logout").addEventListener("click", ()=>{ localStorage.removeItem("jwt"); location.href="index.html"; });


const tbody = document.querySelector("#task-table tbody");
const detailBody = document.getElementById("detail-body");
const tabs = document.querySelectorAll(".tab");
const filterPriority = document.getElementById("filter-priority");
const filterStatus = document.getElementById("filter-status");
const searchInput = document.getElementById("search");
const btnApply = document.getElementById("btn-apply-filter");
const btnRefresh = document.getElementById("btn-refresh");


const shareModal = document.getElementById("share-modal");
const shareUsersSelect = document.getElementById("share-users");
const sharePermission = document.getElementById("share-permission");
const shareTaskTitle = document.getElementById("share-task-title");
let shareTaskId = null;


let allTasks = [];
let allShares = [];
let allUsers = [];
let currentView = "mine"; 


fetchAllData();


tabs.forEach(btn=>{
  btn.addEventListener("click", ()=> {
    tabs.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    renderList();
  });
});


btnApply.addEventListener("click", ()=> renderList());
btnRefresh.addEventListener("click", ()=> fetchAllData());


async function fetchAllData(){
    showLoading();
  try{
    const [tRes,uRes,sRes] = await Promise.all([
      fetch(`${baseURL}/tasks`, {headers: authHeaders()}),
      fetch(`${baseURL}/users`, {headers: authHeaders()}),
      fetch(`${baseURL}/shared-tasks`, {headers: authHeaders()})
    ]);
    if(tRes.status===401) throw new Error("Session expirée");
    allTasks = await tRes.json();
    allUsers = await uRes.json();
    allShares = await sRes.json();

    populateShareUsers(); 
    renderList();
    hideLoading();
  }catch(e){ alert(e.message); 
     
  }
}

function authHeaders(){ return {"Authorization": `Bearer ${token}`, "Accept":"application/json"} }


function populateShareUsers(){
  shareUsersSelect.innerHTML = "";
  allUsers.forEach(u=>{
   
    const id = u.id ?? (typeof u === 'string' ? Number(u.split('/').pop()) : null);
    const label = u.email ?? u.name ?? `User ${id}`;
    if(id === me.id) return;
    const opt = document.createElement("option");
    opt.value = id;
    opt.innerText = label;
    shareUsersSelect.appendChild(opt);
  });
}


function ownerIdOf(task){
  if(task.owner === null || task.owner === undefined) return null;
  if(typeof task.owner === 'string') return Number(task.owner.split("/").pop());
  if(typeof task.owner === 'object') return task.owner.id ?? null;
  return null;
}


function contributorsForTask(taskId){
  return allShares.filter(s => {
   
    const taskRef = typeof s.task === 'string' ? Number(s.task.split('/').pop()) : (s.task?.id ?? null);
    return taskRef === taskId;
  }).map(s => {
    const uid = s.users ? (s.users.id ?? (typeof s.users === 'string' ? Number(s.users.split('/').pop()) : null)) : null;
    const u = allUsers.find(x => x.id === uid) || {};
    return { userId: uid, name: u.name || u.email || `User ${uid}`, role: s.role, permission: s.permission };
  });
}


function renderList(){
  const priorityFilter = filterPriority.value;
  const statusFilter = filterStatus.value;
  const q = searchInput.value.trim().toLowerCase();

  let tasks = Array.isArray(allTasks) ? allTasks.slice() : [];

 
  if(currentView === 'mine'){
    tasks = tasks.filter(t => ownerIdOf(t) === me.id);
  } else if(currentView === 'shared'){

    
    const sharedTaskIds = allShares
  .map(s => {
   
    let taskId = null;
    if (s.task) {
      taskId = typeof s.task === 'string' ? Number(s.task.split('/').pop()) : (s.task.id ?? null);
    }
    return taskId;
  })
  .filter(id => id !== null); 


tasks = tasks.filter(t => sharedTaskIds.includes(Number(t.id)));

  } 

 
  if(priorityFilter) tasks = tasks.filter(t => String(t.priority) === String(priorityFilter));
  if(statusFilter) tasks = tasks.filter(t => (t.status ?? 'pending') === statusFilter);
  if(q) tasks = tasks.filter(t => (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));

 
  tasks.sort((a,b)=>{
    const ad = a.dueDate ? new Date(a.dueDate) : new Date(0);
    const bd = b.dueDate ? new Date(b.dueDate) : new Date(0);
    return ad - bd;
  });


  tbody.innerHTML = "";
  if(tasks.length === 0){
    tbody.innerHTML = `<tr><td colspan="7">Aucune tâche</td></tr>`;
    detailBody.innerHTML = 'Sélectionne une tâche...';
    return;
  }

  tasks.forEach(task=>{
    const tr = document.createElement("tr");
    const ownerId = ownerIdOf(task);
    const ownerLabel = allUsers.find(u=>u.id===ownerId)?.email ?? (ownerId ? `User ${ownerId}` : '—');
    const contribs = contributorsForTask(task.id).map(c => c.name).join(', ') || '—';
    tr.innerHTML = `
      <td class="t-title" data-id="${task.id}">${escapeHtml(task.title)}</td>
      <td>${task.dueDate ? task.dueDate.split('T')[0] : ''}</td>
      <td>${priorityLabel(task.priority)}</td>
      <td>${task.status ?? 'pending'}</td>
      <td>${ownerLabel}</td>
      <td>${escapeHtml(contribs)}</td>
      <td>
        <button class="small" data-action="detail" data-id="${task.id}">Voir</button>
        ${ownerId === me.id ? `<button class="small" data-action="share" data-id="${task.id}">Partager</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });

 
  tbody.querySelectorAll("button[data-action='detail']").forEach(b=>b.addEventListener("click", ()=>{
    const id = Number(b.dataset.id); showTaskDetail(id);
  }));
  tbody.querySelectorAll("button[data-action='share']").forEach(b=>b.addEventListener("click", ()=>{
    shareTaskId = Number(b.dataset.id);
    openShareModal(shareTaskId);
  }));

  hideLoading();}


async function showTaskDetail(taskId){
  const task = allTasks.find(t=>t.id===taskId);
  if(!task) return;
  const ownerId = ownerIdOf(task);
  const ownerLabel = allUsers.find(u=>u.id===ownerId)?.email ?? '—';
  const contribs = contributorsForTask(task.id);

 
  let html = `<h3>${escapeHtml(task.title)}</h3>`;
  html += `<p><strong>Deadline:</strong> ${task.dueDate ? task.dueDate.split('T')[0] : '—'}</p>`;
  html += `<p><strong>Priorité:</strong> ${priorityLabel(task.priority)}</p>`;
  html += `<p><strong>Statut:</strong> ${task.status ?? 'pending'}</p>`;
  html += `<p><strong>Propriétaire:</strong> ${ownerLabel}</p>`;
  html += `<p><strong>Contributeurs:</strong> ${contribs.map(c=>c.name).join(', ') || '—'}</p>`;

 
  try{
    const r = await fetch(`${baseURL}/comments`, { headers: authHeaders() });
    if(!r.ok) throw new Error("Impossible charger commentaires");
    const commentsAll = await r.json();
    const comments = commentsAll.filter(c => {

      const tid = typeof c.task === 'string' ? Number(c.task.split('/').pop()) : (c.task?.id ?? null);
      return tid === taskId;
    });

    html += `<h4>Commentaires (${comments.length})</h4>`;
    html += `<div id="comments">`;
    comments.forEach(c=>{
      const authorId = c.author ? (c.author.id ?? (typeof c.author === 'string' ? Number(c.author.split('/').pop()) : null)) : null;
      const author = allUsers.find(u=>u.id===authorId) || {};
      html += `<div class="comment"><small><strong>${escapeHtml(author.email || author.name || 'User')}</strong> — ${c.createdAt ? c.createdAt.split('T')[0] : ''}</small><div>${escapeHtml(c.content)}</div></div>`;
    });
    html += `</div>`;

  
    html += `<div style="margin-top:10px"><textarea id="new-comment" rows="3" style="width:100%"></textarea><button id="btn-post-comment">Ajouter un commentaire</button></div>`;
  }catch(e){
    html += `<p>Impossible de charger commentaires : ${e.message}</p>`;
  }

  detailBody.innerHTML = html;


  document.getElementById("btn-post-comment")?.addEventListener("click", async ()=>{
    const content = document.getElementById("new-comment").value.trim();
    if(!content) return alert("Écris quelque chose");
   
    const payload = { content, taskId: taskId, authorId: me.id };
    const rr = await fetch(`${baseURL}/comments`, {
      method: "POST",
      headers: {"Authorization": `Bearer ${token}`, "Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    if(!rr.ok) return alert("Erreur ajout commentaire");
 
    await fetchAllData();
    showTaskDetail(taskId);
  });
}


function openShareModal(taskId){
  const t = allTasks.find(x=>x.id===taskId);
  shareTaskTitle.innerText = t ? t.title : taskId;
 
  Array.from(shareUsersSelect.options).forEach(o=> o.selected=false);
  shareModal.classList.remove("hidden");
}
document.getElementById("btn-share-cancel").addEventListener("click", ()=> shareModal.classList.add("hidden"));


document.getElementById("btn-share-confirm").addEventListener("click", async ()=>{
  const selected = Array.from(shareUsersSelect.selectedOptions).map(o => Number(o.value));
  const permission = sharePermission.value;
  if(selected.length === 0) return alert("Choisis au moins un utilisateur");

  try{
    for(const uid of selected){
      const payload = { taskId: shareTaskId, userId: uid, permission: permission, role: 'contributor' };

      const r = await fetch(`${baseURL}/shared-tasks`, {
        method: "POST",
        headers: {"Authorization": `Bearer ${token}`, "Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      if(!r.ok){
        const err = await r.json().catch(()=>({}));
        console.warn("Share error", err);
      }
    }

    await fetchAllData();
    shareModal.classList.add("hidden");
    alert("Partage effectué");
  }catch(e){ alert(e.message); }
});

function priorityLabel(p){ return {1:"Low",2:"Medium",3:"High"}[p] || p || "—"; }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
