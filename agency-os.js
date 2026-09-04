/* ============================================================
   Agency OS – Application logic
   Separated & cleaned for readability
   ============================================================ */

let STATE = { clients: [], templates: [] };
let VIEW = {
  route: 'dashboard',
  clientId: null,
  tab: 'overview',
  search: ''
};
let LOADED = false;
/* Map routes to HTML page filenames */
const ROUTE_PAGES = {
  dashboard: 'index.html',
  clients: 'clients.html',
  client: 'client.html',
  projects: 'projects.html',
  proposals: 'proposals.html',
  invoices: 'invoices.html',
  templates: 'templates.html'
};
/** Read initial route + clientId/tab from the current page & URL */
function readRouteFromPage() {
  const bodyRoute = document.body && document.body.dataset.route;
  if (bodyRoute) VIEW.route = bodyRoute;
  const params = new URLSearchParams(window.location.search);
  if (params.get('id')) VIEW.clientId = params.get('id');
  if (params.get('tab')) VIEW.tab = params.get('tab');
  if (params.get('q')) VIEW.search = params.get('q');
}

const uid = () => Math.random().toString(36).slice(2,9);
const todayISO = () => new Date().toISOString().slice(0,10);
const fmtDate = (iso) => { if(!iso) return '—'; const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
const fmtMoney = (n) => 'R' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const initials = (name) => (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
const daysUntil = (iso) => { if(!iso) return null; const diff = (new Date(iso+'T00:00:00') - new Date(todayISO()+'T00:00:00'))/86400000; return Math.round(diff); };

function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const PROJECT_STATUSES = ['New','Onboarding','Design','Development','Testing','Completed'];
const PROJECT_PROGRESS = {New:5,Onboarding:15,Design:35,Development:60,Testing:85,Completed:100};
const CLIENT_STATUSES = ['Onboarding','Active','Waiting on Client','On Hold','Completed'];
const PROPOSAL_STATUSES = ['Draft','Sent','Viewed','Accepted','Rejected','Expired'];
const INVOICE_STATUSES = ['Unpaid','Partially Paid','Paid','Overdue','Cancelled'];
const REQUEST_STATUSES = ['Requested','Received','Overdue'];
const TASK_PRIORITIES = ['Low','Medium','High'];

/* ============================= STORAGE (localStorage) ============================= */
const STORAGE_PREFIX = 'agency-os:';

function storageGet(key) {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch (e) {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function storageHas(key) {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) !== null;
  } catch (e) {
    return false;
  }
}

async function loadState() {
  // Clients
  try {
    const raw = storageGet('clients');
    STATE.clients = raw ? JSON.parse(raw) : seedClients();
  } catch (e) {
    STATE.clients = seedClients();
  }

  // Templates
  try {
    const raw = storageGet('templates');
    STATE.templates = raw ? JSON.parse(raw) : seedTemplates();
  } catch (e) {
    STATE.templates = seedTemplates();
  }

  // Persist seed data the first time so later reloads keep edits
  if (!storageHas('clients')) saveClients();
  if (!storageHas('templates')) saveTemplates();

  LOADED = true;
  readRouteFromPage();
  render();
}

function saveClients() {
  if (!storageSet('clients', JSON.stringify(STATE.clients))) {
    toast('Could not save — changes may not persist');
  }
}

function saveTemplates() {
  if (!storageSet('templates', JSON.stringify(STATE.templates))) {
    toast('Could not save templates');
  }
}

function persistAndRender() {
  saveClients();
  render();
}

function seedTemplates(){
  return [
    {id:uid(), name:'Kickoff welcome', subject:'Welcome aboard, {{client_name}}', body:'Hi {{client_name}},\n\nThanks for choosing us for {{project_name}}. We are excited to get started.\n\nNext, we will send over an information request so we can begin design.\n\nBest,\nThe Team'},
    {id:uid(), name:'Content reminder', subject:'Quick reminder — {{project_name}}', body:'Hi {{client_name}},\n\nJust a friendly nudge that we are still waiting on a few items for {{project_name}}. Let us know if you need a hand.\n\nBest,\nThe Team'},
    {id:uid(), name:'Invoice sent', subject:'Invoice for {{project_name}}', body:'Hi {{client_name}},\n\nPlease find attached the invoice for {{project_name}}. Let us know if you have any questions.\n\nBest,\nThe Team'}
  ];
}
function seedClients(){
  const c1 = uid(), p1 = uid(), p2 = uid();
  return [
    {
      id:c1, name:'Naledi Khumalo', business:'Khumalo & Sons Attorneys', email:'naledi@khumalolaw.co.za', phone:'+27 82 555 0142',
      status:'Active', assignedTo:'Thabo', createdAt:todayISO(),
      projects:[
        {id:p1, name:'Firm website redesign', type:'Website Dev', status:'Development', progress:60, startDate:'2026-06-01', dueDate:'2026-09-15', description:'Full rebuild of the marketing site on a new CMS.'},
        {id:p2, name:'Monthly maintenance', type:'Maintenance', status:'Onboarding', progress:15, startDate:'2026-08-01', dueDate:'', description:'Ongoing updates, backups and monitoring.'}
      ],
      tasks:[
        {id:uid(), title:'Review homepage wireframes', projectId:p1, assignee:'Thabo', dueDate:'2026-09-02', priority:'High', done:false},
        {id:uid(), title:'Set up staging server', projectId:p1, assignee:'Sam', dueDate:'2026-08-20', priority:'Medium', done:true}
      ],
      notes:[{id:uid(), text:'Prefers WhatsApp for quick questions, email for anything formal.', author:'Thabo', date:todayISO()}],
      timeline:[{id:uid(), type:'client', text:'Client profile created', date:'2026-06-01'}],
      emails:[], infoRequests:[
        {id:uid(), item:'Firm logo (vector)', status:'Received', requestedDate:'2026-06-05', notes:''},
        {id:uid(), item:'Team bios and headshots', status:'Requested', requestedDate:'2026-08-15', notes:'Need square photos, min 800px'}
      ],
      followUps:[{id:uid(), note:'Check in on homepage feedback', date:'2026-09-03', done:false}],
      proposals:[{id:uid(), title:'Website redesign proposal', services:[{name:'Discovery and UX',price:8500},{name:'Design',price:12000},{name:'Development',price:24000}], vatPercent:15, status:'Accepted', date:'2026-05-20', notes:'50% deposit, 50% on launch.'}],
      invoices:[{id:uid(), title:'Deposit — website redesign', items:[{name:'Deposit (50%)',price:22250}], vatPercent:0, status:'Paid', date:'2026-06-02', dueDate:'2026-06-16', proposalId:null}]
    },
    {
      id:uid(), name:'Marcus Chen', business:'Chen Coffee Roasters', email:'marcus@chencoffee.com', phone:'+27 71 555 0198',
      status:'Waiting on Client', assignedTo:'Sam', createdAt:'2026-07-10',
      projects:[{id:uid(), name:'E-commerce store', type:'Website Dev', status:'Design', progress:35, startDate:'2026-07-10', dueDate:'2026-10-01', description:'Online store with subscription coffee plans.'}],
      tasks:[{id:uid(), title:'Send moodboard for approval', projectId:null, assignee:'Sam', dueDate:'2026-09-01', priority:'Medium', done:false}],
      notes:[], timeline:[{id:uid(), type:'client', text:'Client profile created', date:'2026-07-10'}],
      emails:[], infoRequests:[{id:uid(), item:'Product photography', status:'Requested', requestedDate:'2026-08-10', notes:'Overdue by two weeks'}],
      followUps:[], proposals:[], invoices:[]
    }
  ];
}

/* ============================= TOAST ============================= */
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 2400);
}

/* ============================= NAV HELPERS ============================= */
function pageFor(route) {
  return ROUTE_PAGES[route] || 'index.html';
}

/** Navigate to another page (real multi-page links) */
function goto(route, extra) {
  const prev = { ...VIEW };
  VIEW.route = route;
  if (extra) Object.assign(VIEW, extra);

  // Client detail page
  if (route === 'client') {
    const id = VIEW.clientId || (extra && extra.clientId);
    const tab = (extra && extra.tab) || VIEW.tab || 'overview';
    VIEW.clientId = id;
    VIEW.tab = tab;

    const current = (window.location.pathname.split('/').pop() || '');
    // Already on client.html with same id → soft tab switch only
    if (current === 'client.html' && prev.clientId === id) {
      // Keep URL in sync without full reload
      const url = 'client.html?id=' + encodeURIComponent(id || '') + '&tab=' + encodeURIComponent(tab);
      history.replaceState(null, '', url);
      render();
      window.scrollTo(0, 0);
      return;
    }

    window.location.href = 'client.html?id=' + encodeURIComponent(id || '') + '&tab=' + encodeURIComponent(tab);
    return;
  }

  // Same top-level page → re-render
  const target = pageFor(route);
  const current = window.location.pathname.split('/').pop() || 'index.html';
  if (current === target || (current === '' && target === 'index.html')) {
    render();
    window.scrollTo(0, 0);
    return;
  }

  // Different page → full navigation
  window.location.href = target;
}

function openClient(id, tab) {
  goto('client', { clientId: id, tab: tab || 'overview' });
}

function getClient(id) {
  return STATE.clients.find(c => c.id === id);
}

/* ============================= DERIVED / METRICS ============================= */
function allProjects(){ return STATE.clients.flatMap(c=>c.projects.map(p=>({...p, clientId:c.id, clientName:c.name}))); }
function allTasks(){ return STATE.clients.flatMap(c=>c.tasks.map(t=>({...t, clientId:c.id, clientName:c.name}))); }
function allProposals(){ return STATE.clients.flatMap(c=>c.proposals.map(p=>({...p, clientId:c.id, clientName:c.name}))); }
function allInvoices(){ return STATE.clients.flatMap(c=>c.invoices.map(i=>({...i, clientId:c.id, clientName:c.name}))); }
function allFollowUps(){ return STATE.clients.flatMap(c=>c.followUps.map(f=>({...f, clientId:c.id, clientName:c.name}))); }
function allInfoRequests(){ return STATE.clients.flatMap(c=>c.infoRequests.map(r=>({...r, clientId:c.id, clientName:c.name}))); }

function lineTotal(items){ return (items||[]).reduce((s,i)=>s+Number(i.price||0),0); }
function withVat(items, vatPercent){ const sub = lineTotal(items); const vat = sub*(Number(vatPercent||0)/100); return {sub, vat, total: sub+vat}; }

function addTimeline(client, type, text){
  client.timeline.unshift({id:uid(), type, text, date: todayISO()});
}

/* ============================= RENDER ROOT ============================= */
function render(){
  if(!LOADED) return;
  renderSidebar();
  renderMain();
}

function renderSidebar() {
  // Sidebar markup lives in the HTML pages.
  // Here we only refresh live counts.
  const clientsEl = document.getElementById('nav-count-clients');
  const projectsEl = document.getElementById('nav-count-projects');
  if (clientsEl) clientsEl.textContent = STATE.clients.length;
  if (projectsEl) {
    projectsEl.textContent = allProjects().filter(p => p.status !== 'Completed').length;
  }
}

function renderMain() {
  // Prefer #content (static page shell). Fall back to #main for client detail.
  const target = document.getElementById('content') || document.getElementById('main');
  if (!target) return;

  // Sync search input if present
  const searchInput = document.getElementById('client-search');
  if (searchInput && searchInput.value !== VIEW.search) {
    searchInput.value = VIEW.search;
  }

  if (VIEW.route === 'dashboard') target.innerHTML = viewDashboard();
  else if (VIEW.route === 'clients') target.innerHTML = viewClients();
  else if (VIEW.route === 'client') target.innerHTML = viewClientDetail();
  else if (VIEW.route === 'projects') target.innerHTML = viewAllProjects();
  else if (VIEW.route === 'proposals') target.innerHTML = viewAllProposals();
  else if (VIEW.route === 'invoices') target.innerHTML = viewAllInvoices();
  else if (VIEW.route === 'templates') target.innerHTML = viewTemplates();
  else target.innerHTML = viewDashboard();
}

/* ============================= DASHBOARD ============================= */
function viewDashboard(){
  const projects = allProjects();
  const activeProjects = projects.filter(p=>p.status!=='Completed');
  const waiting = allInfoRequests().filter(r=>r.status==='Requested' || r.status==='Overdue');
  const pendingProposals = allProposals().filter(p=>p.status==='Sent'||p.status==='Viewed');
  const outstandingInvoices = allInvoices().filter(i=>['Unpaid','Partially Paid','Overdue'].includes(i.status));
  const outstandingTotal = outstandingInvoices.reduce((s,i)=>s+withVat(i.items,i.vatPercent).total,0);

  const tasksDue = allTasks().filter(t=>!t.done && t.dueDate && daysUntil(t.dueDate)<=0);
  const followUpsDue = allFollowUps().filter(f=>!f.done && f.date && daysUntil(f.date)<=0);
  const todaysActions = [
    ...tasksDue.map(t=>({label:t.title, sub:t.clientName, date:t.dueDate, kind:'Task', clientId:t.clientId})),
    ...followUpsDue.map(f=>({label:f.note, sub:f.clientName, date:f.date, kind:'Follow-up', clientId:f.clientId}))
  ].sort((a,b)=> (a.date||'').localeCompare(b.date||''));

  return `
    <div class="metric-grid">
      <div class="metric"><div class="metric-label">Total clients</div><div class="metric-value">${STATE.clients.length}</div></div>
      <div class="metric"><div class="metric-label">Active projects</div><div class="metric-value">${activeProjects.length}</div></div>
      <div class="metric"><div class="metric-label">Waiting on client</div><div class="metric-value ${waiting.length?'warn':''}">${waiting.length}</div></div>
      <div class="metric"><div class="metric-label">Pending proposals</div><div class="metric-value">${pendingProposals.length}</div></div>
      <div class="metric"><div class="metric-label">Outstanding invoices</div><div class="metric-value ${outstandingInvoices.length?'danger':''}">${fmtMoney(outstandingTotal)}</div></div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="panel-head"><h3>Today's actions</h3></div>
      ${todaysActions.length ? todaysActions.map(a=>`
        <div class="list-row">
          <span class="badge ${a.kind==='Task'?'b-accent':'b-warn'}">${a.kind}</span>
          <div style="flex:1;">
            <div style="font-weight:500;">${esc(a.label)}</div>
            <div style="font-size:12px;color:var(--ink-faint);">${esc(a.sub)} · ${daysUntil(a.date)<0?'overdue '+fmtDate(a.date):'due '+fmtDate(a.date)}</div>
          </div>
          <button class="btn btn-sm" onclick="openClient('${a.clientId}')">Open client</button>
        </div>
      `).join('') : `<div class="empty"><div class="empty-title">Nothing due right now</div><p>Tasks and follow-ups will appear here as they come due.</p></div>`}
    </div>

    <div class="card">
      <div class="panel-head"><h3>Recent clients</h3><button class="btn btn-sm" onclick="goto('clients')">View all</button></div>
      ${STATE.clients.slice(0,5).map(c=>clientRowMini(c)).join('') || `<div class="empty"><div class="empty-title">No clients yet</div><p>Add your first client to get started.</p></div>`}
    </div>
  `;
}
function clientRowMini(c){
  return `
    <div class="list-row" style="cursor:pointer;" onclick="openClient('${c.id}')">
      <div class="avatar">${esc(initials(c.name))}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:500;">${esc(c.name)}</div>
        <div style="font-size:12px;color:var(--ink-faint);">${esc(c.business||'—')}</div>
      </div>
      ${statusBadge(c.status)}
    </div>
  `;
}

/* ============================= CLIENTS LIST ============================= */
function statusBadge(status){
  const map = {
    'Active':'b-success','Onboarding':'b-accent','Waiting on Client':'b-warn','On Hold':'b-gray','Completed':'b-gray',
    'New':'b-gray','Design':'b-accent','Development':'b-accent','Testing':'b-warn',
    'Draft':'b-gray','Sent':'b-accent','Viewed':'b-warn','Accepted':'b-success','Rejected':'b-danger','Expired':'b-gray',
    'Unpaid':'b-warn','Partially Paid':'b-warn','Paid':'b-success','Overdue':'b-danger','Cancelled':'b-gray',
    'Requested':'b-warn','Received':'b-success'
  };
  return `<span class="badge ${map[status]||'b-gray'}">${esc(status)}</span>`;
}

function viewClients() {
  const q = VIEW.search.toLowerCase();
  const filtered = STATE.clients.filter(c => {
    if (!q) return true;
    return (
      [c.name, c.business, c.email, c.phone].some(v =>
        (v || '').toLowerCase().includes(q)
      ) || c.projects.some(p => (p.name || '').toLowerCase().includes(q))
    );
  });

  // Page header + search live in clients.html — only the list is dynamic
  if (!filtered.length) {
    return `<div class="empty">
      <div class="empty-title">No clients match</div>
      <p>Try a different search, or add a new client.</p>
    </div>`;
  }

  return filtered
    .map(
      c => `
    <div class="client-card" onclick="openClient('${c.id}')">
      <div class="avatar">${esc(initials(c.name))}</div>
      <div class="client-card-main">
        <div class="client-card-name">${esc(c.name)}</div>
        <div class="client-card-sub">${esc(c.business || '—')} · ${esc(c.email || '—')}</div>
      </div>
      <div style="font-size:12.5px;color:var(--ink-faint); min-width:90px; text-align:right;">
        ${c.projects.length} project${c.projects.length === 1 ? '' : 's'}
      </div>
      ${statusBadge(c.status)}
    </div>`
    )
    .join('');
}

function openClientForm(client){
  openFormModal({
    title: client? 'Edit client' : 'Add client',
    fields:[
      {key:'name', label:'Full name', type:'text', required:true},
      {key:'business', label:'Business name', type:'text'},
      {key:'email', label:'Email', type:'text'},
      {key:'phone', label:'Phone', type:'text'},
      {key:'status', label:'Status', type:'select', options:CLIENT_STATUSES},
      {key:'assignedTo', label:'Assigned team member', type:'text'}
    ],
    initial: client || {status:'Onboarding'},
    onSubmit:(vals)=>{
      if(client){
        Object.assign(client, vals);
        addTimeline(client, 'client', 'Client details updated');
        toast('Client updated');
      }else{
        const c = {id:uid(), createdAt:todayISO(), projects:[], tasks:[], notes:[], timeline:[], emails:[], infoRequests:[], followUps:[], proposals:[], invoices:[], ...vals};
        addTimeline(c, 'client', 'Client profile created');
        STATE.clients.unshift(c);
        toast('Client added');
      }
      persistAndRender();
    }
  });
}
function deleteClient(id){
  if(!confirm('Delete this client and all their data? This cannot be undone.')) return;
  STATE.clients = STATE.clients.filter(c=>c.id!==id);
  persistAndRender();
  goto('clients');
  toast('Client deleted');
}

/* ============================= CLIENT DETAIL ============================= */
function viewClientDetail(){
  const c = getClient(VIEW.clientId);
  if(!c) return `<div class="empty"><div class="empty-title">Client not found</div><p><a onclick="goto('clients')" style="cursor:pointer;color:var(--accent-ink);">Back to clients</a></p></div>`;
  const tabs = [
    ['overview','Overview'], ['projects','Projects ('+c.projects.length+')'], ['tasks','Tasks ('+c.tasks.filter(t=>!t.done).length+')'],
    ['communication','Communication'], ['requests','Info requests'], ['proposals','Proposals'], ['invoices','Invoices'],
    ['notes','Notes'], ['timeline','Timeline']
  ];
  return `
    <div class="crumb"><a onclick="goto('clients')">Clients</a> / ${esc(c.name)}</div>
    <div class="page-head">
      <div style="display:flex; gap:14px; align-items:center;">
        <div class="avatar" style="width:48px;height:48px;font-size:16px;">${esc(initials(c.name))}</div>
        <div>
          <h1 class="page-title">${esc(c.name)}</h1>
          <div class="page-sub">${esc(c.business||'No business name')} ${c.assignedTo? ' · Assigned to '+esc(c.assignedTo):''}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        ${statusBadge(c.status)}
        <button class="btn btn-sm" onclick="openClientForm(getClient('${c.id}'))">Edit</button>
        <button class="btn-danger-text" onclick="deleteClient('${c.id}')">Delete</button>
      </div>
    </div>
    <div class="tabs">
      ${tabs.map(([k,l])=>`<button class="tab ${VIEW.tab===k?'active':''}" onclick="goto('client',{clientId:'${c.id}',tab:'${k}'})">${l}</button>`).join('')}
    </div>
    <div id="tab-body">${renderClientTab(c)}</div>
  `;
}

function renderClientTab(c){
  switch(VIEW.tab){
    case 'projects': return tabProjects(c);
    case 'tasks': return tabTasks(c);
    case 'communication': return tabCommunication(c);
    case 'requests': return tabRequests(c);
    case 'proposals': return tabProposals(c);
    case 'invoices': return tabInvoices(c);
    case 'notes': return tabNotes(c);
    case 'timeline': return tabTimeline(c);
    default: return tabOverview(c);
  }
}

/* ---- Overview ---- */
function tabOverview(c){
  const openTasks = c.tasks.filter(t=>!t.done);
  const openReqs = c.infoRequests.filter(r=>r.status!=='Received');
  const openFollow = c.followUps.filter(f=>!f.done);
  return `
    <div style="display:grid; grid-template-columns:1.3fr 1fr; gap:18px;">
      <div class="card">
        <div class="panel-head"><h3>Contact details</h3></div>
        <table>
          <tr><td style="color:var(--ink-faint); width:110px;">Email</td><td>${esc(c.email)||'—'}</td></tr>
          <tr><td style="color:var(--ink-faint);">Phone</td><td>${esc(c.phone)||'—'}</td></tr>
          <tr><td style="color:var(--ink-faint);">Business</td><td>${esc(c.business)||'—'}</td></tr>
          <tr><td style="color:var(--ink-faint);">Client since</td><td>${fmtDate(c.createdAt)}</td></tr>
          <tr><td style="color:var(--ink-faint);">Assigned to</td><td>${esc(c.assignedTo)||'—'}</td></tr>
        </table>
      </div>
      <div class="card">
        <div class="panel-head"><h3>At a glance</h3></div>
        <table>
          <tr><td>Projects</td><td style="text-align:right;">${c.projects.length}</td></tr>
          <tr><td>Open tasks</td><td style="text-align:right;">${openTasks.length}</td></tr>
          <tr><td>Pending info requests</td><td style="text-align:right;">${openReqs.length}</td></tr>
          <tr><td>Open follow-ups</td><td style="text-align:right;">${openFollow.length}</td></tr>
          <tr><td>Proposals</td><td style="text-align:right;">${c.proposals.length}</td></tr>
          <tr><td>Invoices</td><td style="text-align:right;">${c.invoices.length}</td></tr>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top:18px;">
      <div class="panel-head"><h3>Active projects</h3><button class="btn btn-sm" onclick="goto('client',{clientId:'${c.id}',tab:'projects'})">View all</button></div>
      ${c.projects.filter(p=>p.status!=='Completed').slice(0,4).map(p=>projectRow(c,p)).join('') || `<div class="empty"><p>No active projects.</p></div>`}
    </div>
  `;
}

/* ---- Projects ---- */
function projectRow(c,p){
  return `
    <div class="list-row" style="cursor:pointer;" onclick="openProjectForm(getClient('${c.id}'), getClient('${c.id}').projects.find(x=>x.id==='${p.id}'))">
      <div style="flex:1;">
        <div style="font-weight:500;">${esc(p.name)}</div>
        <div style="font-size:12px;color:var(--ink-faint);">${esc(p.type||'—')}${p.dueDate?' · due '+fmtDate(p.dueDate):''}</div>
      </div>
      <div style="width:120px;">
        <div class="progress-track"><div class="progress-fill" style="width:${p.progress||0}%;"></div></div>
      </div>
      ${statusBadge(p.status)}
    </div>
  `;
}
function tabProjects(c){
  return `
    <div class="panel-head"><h3>Projects</h3><button class="btn btn-sm btn-primary" onclick="openProjectForm(getClient('${c.id}'))">+ Add project</button></div>
    <div class="card">
      ${c.projects.length ? c.projects.map(p=>projectRow(c,p)).join('') : `<div class="empty"><div class="empty-title">No projects yet</div><p>Create the first project for this client.</p></div>`}
    </div>
  `;
}
function openProjectForm(client, project){
  openFormModal({
    title: project ? 'Edit project' : 'Add project',
    fields:[
      {key:'name', label:'Project name', type:'text', required:true},
      {key:'type', label:'Type', type:'select', options:['Website Dev','Maintenance','SEO','Branding','E-commerce','Other']},
      {key:'status', label:'Status', type:'select', options:PROJECT_STATUSES},
      {key:'startDate', label:'Start date', type:'date'},
      {key:'dueDate', label:'Due date', type:'date'},
      {key:'description', label:'Description', type:'textarea'}
    ],
    initial: project || {status:'New'},
    onSubmit:(vals)=>{
      vals.progress = PROJECT_PROGRESS[vals.status] ?? 0;
      if(project){
        const oldStatus = project.status;
        Object.assign(project, vals);
        if(oldStatus!==vals.status) addTimeline(client,'project', `${project.name}: status changed to ${vals.status}`);
        toast('Project updated');
      }else{
        const p = {id:uid(), ...vals};
        client.projects.unshift(p);
        addTimeline(client,'project', `Project created: ${p.name}`);
        toast('Project added');
      }
      persistAndRender();
    },
    onDelete: project ? ()=>{
      client.projects = client.projects.filter(x=>x.id!==project.id);
      addTimeline(client,'project', `Project removed: ${project.name}`);
      persistAndRender();
    } : null
  });
}

/* ---- Tasks ---- */
function tabTasks(c){
  const sorted = [...c.tasks].sort((a,b)=> (a.done - b.done) || (a.dueDate||'zzz').localeCompare(b.dueDate||'zzz'));
  return `
    <div class="panel-head"><h3>Tasks</h3><button class="btn btn-sm btn-primary" onclick="openTaskForm(getClient('${c.id}'))">+ Add task</button></div>
    <div class="card">
      ${sorted.length ? sorted.map(t=>`
        <div class="list-row">
          <input type="checkbox" ${t.done?'checked':''} onchange="toggleTask('${c.id}','${t.id}')" style="width:16px;height:16px;">
          <div style="flex:1; ${t.done?'opacity:.5; text-decoration:line-through;':''}">
            <div style="font-weight:500;">${esc(t.title)}</div>
            <div style="font-size:12px;color:var(--ink-faint);">${t.assignee?esc(t.assignee)+' · ':''}${t.dueDate?'due '+fmtDate(t.dueDate):'no due date'}${projectNameFor(c,t.projectId)?' · '+esc(projectNameFor(c,t.projectId)):''}</div>
          </div>
          <span class="badge ${t.priority==='High'?'b-danger':t.priority==='Medium'?'b-warn':'b-gray'}">${t.priority}</span>
          <button class="icon-btn" onclick="openTaskForm(getClient('${c.id}'), getClient('${c.id}').tasks.find(x=>x.id==='${t.id}'))">Edit</button>
        </div>
      `).join('') : `<div class="empty"><div class="empty-title">No tasks yet</div><p>Add a task to keep this project moving.</p></div>`}
    </div>
  `;
}
function projectNameFor(c, projectId){ const p = c.projects.find(x=>x.id===projectId); return p ? p.name : ''; }
function toggleTask(clientId, taskId){
  const c = getClient(clientId); const t = c.tasks.find(x=>x.id===taskId);
  t.done = !t.done;
  if(t.done) addTimeline(c,'task', `Task completed: ${t.title}`);
  persistAndRender();
}
function openTaskForm(client, task){
  openFormModal({
    title: task ? 'Edit task' : 'Add task',
    fields:[
      {key:'title', label:'Task', type:'text', required:true},
      {key:'projectId', label:'Project', type:'select', options: client.projects.map(p=>({value:p.id,label:p.name})), allowEmpty:'No linked project'},
      {key:'assignee', label:'Assigned to', type:'text'},
      {key:'dueDate', label:'Due date', type:'date'},
      {key:'priority', label:'Priority', type:'select', options:TASK_PRIORITIES}
    ],
    initial: task || {priority:'Medium'},
    onSubmit:(vals)=>{
      if(task){ Object.assign(task, vals); toast('Task updated'); }
      else{
        client.tasks.unshift({id:uid(), done:false, ...vals});
        addTimeline(client,'task', `Task added: ${vals.title}`);
        toast('Task added');
      }
      persistAndRender();
    },
    onDelete: task ? ()=>{ client.tasks = client.tasks.filter(x=>x.id!==task.id); persistAndRender(); } : null
  });
}

/* ---- Communication ---- */
function tabCommunication(c){
  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start;">
      <div class="card">
        <div class="panel-head"><h3>Compose email</h3></div>
        <div class="hint" style="margin-bottom:12px;">Sends are simulated in this demo — composing here logs the email to this client's history, the way it would once your email provider is connected.</div>
        <div class="field">
          <label>Template</label>
          <select onchange="applyTemplate('${c.id}', this.value)">
            <option value="">Blank email</option>
            ${STATE.templates.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Subject</label><input id="email-subject" placeholder="Subject line"></div>
        <div class="field"><label>Message</label><textarea id="email-body" style="min-height:140px;" placeholder="Write your message..."></textarea></div>
        <button class="btn btn-primary" onclick="logEmail('${c.id}')">Log email</button>
      </div>
      <div class="card">
        <div class="panel-head"><h3>Email history</h3></div>
        ${c.emails.length ? c.emails.map(e=>`
          <div class="list-row" style="align-items:flex-start;">
            <div style="flex:1;">
              <div style="font-weight:500;">${esc(e.subject)}</div>
              <div style="font-size:12px;color:var(--ink-faint); white-space:pre-wrap; margin-top:3px;">${esc(e.body).slice(0,140)}${e.body.length>140?'…':''}</div>
              <div class="tl-date" style="margin-top:4px;">${fmtDate(e.date)}</div>
            </div>
          </div>
        `).join('') : `<div class="empty"><p>No emails logged yet.</p></div>`}
      </div>
    </div>
    <div class="card" style="margin-top:18px;">
      <div class="panel-head"><h3>Follow-ups</h3><button class="btn btn-sm btn-primary" onclick="openFollowUpForm(getClient('${c.id}'))">+ Add follow-up</button></div>
      ${c.followUps.length ? c.followUps.map(f=>`
        <div class="list-row">
          <input type="checkbox" ${f.done?'checked':''} onchange="toggleFollowUp('${c.id}','${f.id}')" style="width:16px;height:16px;">
          <div style="flex:1; ${f.done?'opacity:.5; text-decoration:line-through;':''}">
            <div style="font-weight:500;">${esc(f.note)}</div>
            <div style="font-size:12px;color:var(--ink-faint);">${f.date?fmtDate(f.date):'no date'} ${!f.done && f.date && daysUntil(f.date)<0 ? '· overdue':''}</div>
          </div>
        </div>
      `).join('') : `<div class="empty"><p>No follow-ups scheduled.</p></div>`}
    </div>
  `;
}
function applyTemplate(clientId, templateId){
  const c = getClient(clientId);
  const t = STATE.templates.find(x=>x.id===templateId);
  const subjEl = document.getElementById('email-subject'), bodyEl = document.getElementById('email-body');
  if(!t){ return; }
  const proj = c.projects[0];
  const fill = (s) => (s||'').replaceAll('{{client_name}}', c.name).replaceAll('{{project_name}}', proj?proj.name:'your project');
  subjEl.value = fill(t.subject); bodyEl.value = fill(t.body);
}
function logEmail(clientId){
  const c = getClient(clientId);
  const subject = document.getElementById('email-subject').value.trim();
  const body = document.getElementById('email-body').value.trim();
  if(!subject){ toast('Add a subject before logging'); return; }
  c.emails.unshift({id:uid(), subject, body, date:todayISO()});
  addTimeline(c,'email', `Email logged: ${subject}`);
  persistAndRender();
  toast('Email logged to history');
}
function openFollowUpForm(client){
  openFormModal({
    title:'Add follow-up',
    fields:[
      {key:'note', label:'What needs following up', type:'text', required:true},
      {key:'date', label:'Follow up on', type:'date'}
    ],
    initial:{date:todayISO()},
    onSubmit:(vals)=>{ client.followUps.unshift({id:uid(), done:false, ...vals}); persistAndRender(); toast('Follow-up added'); }
  });
}
function toggleFollowUp(clientId, id){
  const c = getClient(clientId); const f = c.followUps.find(x=>x.id===id);
  f.done = !f.done; persistAndRender();
}

/* ---- Info requests ---- */
function tabRequests(c){
  return `
    <div class="panel-head"><h3>Information requests</h3><button class="btn btn-sm btn-primary" onclick="openRequestForm(getClient('${c.id}'))">+ Request item</button></div>
    <div class="card">
      ${c.infoRequests.length ? c.infoRequests.map(r=>`
        <div class="list-row">
          <div style="flex:1;">
            <div style="font-weight:500;">${esc(r.item)}</div>
            <div style="font-size:12px;color:var(--ink-faint);">Requested ${fmtDate(r.requestedDate)}${r.notes?' · '+esc(r.notes):''}</div>
          </div>
          <select onchange="setRequestStatus('${c.id}','${r.id}', this.value)" style="width:130px; padding:5px 8px; border:1px solid var(--border-strong); border-radius:7px;">
            ${REQUEST_STATUSES.map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      `).join('') : `<div class="empty"><div class="empty-title">Nothing requested yet</div><p>Ask the client for logos, copy, photos or anything else you need.</p></div>`}
    </div>
  `;
}
function openRequestForm(client){
  openFormModal({
    title:'Request information',
    fields:[
      {key:'item', label:'What do you need', type:'text', required:true},
      {key:'notes', label:'Notes', type:'textarea'}
    ],
    initial:{},
    onSubmit:(vals)=>{
      client.infoRequests.unshift({id:uid(), status:'Requested', requestedDate:todayISO(), ...vals});
      addTimeline(client,'request', `Information requested: ${vals.item}`);
      persistAndRender(); toast('Request added');
    }
  });
}
function setRequestStatus(clientId, id, status){
  const c = getClient(clientId); const r = c.infoRequests.find(x=>x.id===id);
  r.status = status;
  if(status==='Received') addTimeline(c,'request', `Received: ${r.item}`);
  persistAndRender();
}

/* ---- Proposals ---- */
function tabProposals(c){
  return `
    <div class="panel-head"><h3>Proposals</h3><button class="btn btn-sm btn-primary" onclick="openProposalForm(getClient('${c.id}'))">+ New proposal</button></div>
    ${c.proposals.length ? c.proposals.map(p=>{
      const t = withVat(p.services, p.vatPercent);
      return `
      <div class="card" style="margin-bottom:12px;">
        <div class="panel-head">
          <div>
            <h3>${esc(p.title)}</h3>
            <div class="hint">Sent ${fmtDate(p.date)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${statusBadge(p.status)}
            <button class="btn btn-sm" onclick="openProposalForm(getClient('${c.id}'), getClient('${c.id}').proposals.find(x=>x.id==='${p.id}'))">Edit</button>
            <button class="btn btn-sm" onclick="printDoc('${c.id}','proposal','${p.id}')">Print / PDF</button>
          </div>
        </div>
        <table>
          <tr><th>Service</th><th style="text-align:right;">Price</th></tr>
          ${p.services.map(s=>`<tr><td>${esc(s.name)}</td><td style="text-align:right;">${fmtMoney(s.price)}</td></tr>`).join('')}
        </table>
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><span>${fmtMoney(t.sub)}</span></div>
          <div class="totals-row"><span>VAT (${p.vatPercent||0}%)</span><span>${fmtMoney(t.vat)}</span></div>
          <div class="totals-row grand"><span>Total</span><span>${fmtMoney(t.total)}</span></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select onchange="setProposalStatus('${c.id}','${p.id}', this.value)" style="width:140px; padding:5px 8px; border:1px solid var(--border-strong); border-radius:7px;">
            ${PROPOSAL_STATUSES.map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
          ${p.status==='Accepted' ? `<button class="btn btn-sm btn-primary" onclick="convertToInvoice('${c.id}','${p.id}')">Convert to invoice</button>` : ''}
        </div>
      </div>
    `}).join('') : `<div class="empty"><div class="empty-title">No proposals yet</div><p>Create a proposal with services, pricing and VAT.</p></div>`}
  `;
}
function openProposalForm(client, proposal){
  openLineItemModal({
    title: proposal ? 'Edit proposal' : 'New proposal',
    entity: proposal,
    itemLabel: 'Service',
    extraFields:[
      {key:'status', label:'Status', type:'select', options:PROPOSAL_STATUSES},
      {key:'notes', label:'Terms / notes', type:'textarea'}
    ],
    itemsKey:'services',
    onSubmit:(vals)=>{
      if(proposal){ Object.assign(proposal, vals); toast('Proposal updated'); }
      else{
        const p = {id:uid(), date:todayISO(), status:'Draft', ...vals};
        client.proposals.unshift(p);
        addTimeline(client,'proposal', `Proposal created: ${p.title}`);
        toast('Proposal created');
      }
      persistAndRender();
    },
    onDelete: proposal ? ()=>{ client.proposals = client.proposals.filter(x=>x.id!==proposal.id); persistAndRender(); } : null
  });
}
function setProposalStatus(clientId, id, status){
  const c = getClient(clientId); const p = c.proposals.find(x=>x.id===id);
  p.status = status;
  addTimeline(c,'proposal', `Proposal "${p.title}" marked ${status}`);
  persistAndRender();
}
function convertToInvoice(clientId, proposalId){
  const c = getClient(clientId); const p = c.proposals.find(x=>x.id===proposalId);
  const inv = {id:uid(), title:'Invoice — '+p.title, items:p.services.map(s=>({...s})), vatPercent:p.vatPercent, status:'Unpaid', date:todayISO(), dueDate:'', proposalId:p.id};
  c.invoices.unshift(inv);
  addTimeline(c,'invoice', `Invoice created from proposal: ${p.title}`);
  persistAndRender();
  goto('client',{clientId:c.id, tab:'invoices'});
  toast('Invoice created from proposal');
}

/* ---- Invoices ---- */
function tabInvoices(c){
  return `
    <div class="panel-head"><h3>Invoices</h3><button class="btn btn-sm btn-primary" onclick="openInvoiceForm(getClient('${c.id}'))">+ New invoice</button></div>
    ${c.invoices.length ? c.invoices.map(inv=>{
      const t = withVat(inv.items, inv.vatPercent);
      return `
      <div class="card" style="margin-bottom:12px;">
        <div class="panel-head">
          <div>
            <h3>${esc(inv.title)}</h3>
            <div class="hint">Issued ${fmtDate(inv.date)}${inv.dueDate? ' · due '+fmtDate(inv.dueDate):''}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${statusBadge(inv.status)}
            <button class="btn btn-sm" onclick="openInvoiceForm(getClient('${c.id}'), getClient('${c.id}').invoices.find(x=>x.id==='${inv.id}'))">Edit</button>
            <button class="btn btn-sm" onclick="printDoc('${c.id}','invoice','${inv.id}')">Print / PDF</button>
          </div>
        </div>
        <table>
          <tr><th>Item</th><th style="text-align:right;">Price</th></tr>
          ${inv.items.map(s=>`<tr><td>${esc(s.name)}</td><td style="text-align:right;">${fmtMoney(s.price)}</td></tr>`).join('')}
        </table>
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><span>${fmtMoney(t.sub)}</span></div>
          <div class="totals-row"><span>VAT (${inv.vatPercent||0}%)</span><span>${fmtMoney(t.vat)}</span></div>
          <div class="totals-row grand"><span>Total</span><span>${fmtMoney(t.total)}</span></div>
        </div>
        <div style="margin-top:12px;">
          <select onchange="setInvoiceStatus('${c.id}','${inv.id}', this.value)" style="width:140px; padding:5px 8px; border:1px solid var(--border-strong); border-radius:7px;">
            ${INVOICE_STATUSES.map(s=>`<option value="${s}" ${inv.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    `}).join('') : `<div class="empty"><div class="empty-title">No invoices yet</div><p>Create an invoice directly, or convert an accepted proposal.</p></div>`}
  `;
}
function openInvoiceForm(client, invoice){
  openLineItemModal({
    title: invoice ? 'Edit invoice' : 'New invoice',
    entity: invoice,
    itemLabel: 'Item',
    extraFields:[
      {key:'status', label:'Status', type:'select', options:INVOICE_STATUSES},
      {key:'dueDate', label:'Due date', type:'date'}
    ],
    itemsKey:'items',
    onSubmit:(vals)=>{
      if(invoice){ Object.assign(invoice, vals); toast('Invoice updated'); }
      else{
        const inv = {id:uid(), date:todayISO(), status:'Unpaid', proposalId:null, ...vals};
        client.invoices.unshift(inv);
        addTimeline(client,'invoice', `Invoice created: ${inv.title}`);
        toast('Invoice created');
      }
      persistAndRender();
    },
    onDelete: invoice ? ()=>{ client.invoices = client.invoices.filter(x=>x.id!==invoice.id); persistAndRender(); } : null
  });
}
function setInvoiceStatus(clientId, id, status){
  const c = getClient(clientId); const inv = c.invoices.find(x=>x.id===id);
  inv.status = status;
  addTimeline(c,'invoice', `Invoice "${inv.title}" marked ${status}`);
  persistAndRender();
}

/* ---- Print view ---- */
function printDoc(clientId, kind, id){
  const c = getClient(clientId);
  const doc = kind==='proposal' ? c.proposals.find(x=>x.id===id) : c.invoices.find(x=>x.id===id);
  const items = kind==='proposal' ? doc.services : doc.items;
  const t = withVat(items, doc.vatPercent);
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>${esc(doc.title)}</title>
    <style>
      body{font-family:Arial,sans-serif; color:#20242B; padding:48px; max-width:640px; margin:0 auto;}
      h1{font-size:20px;} .muted{color:#5B6068; font-size:13px;}
      table{width:100%; border-collapse:collapse; margin-top:24px;}
      td,th{padding:8px 4px; border-bottom:1px solid #DEDBD1; font-size:13px; text-align:left;}
      .right{text-align:right;} .totals{margin-top:16px; width:260px; margin-left:auto;}
      .grand{font-weight:bold; border-top:1px solid #999; padding-top:8px;}
    </style></head><body>
      <h1>${esc(doc.title)}</h1>
      <div class="muted">${kind==='proposal'?'Proposal':'Invoice'} for ${esc(c.name)} — ${esc(c.business||'')}</div>
      <div class="muted">Date: ${fmtDate(doc.date)}${doc.dueDate?' · Due: '+fmtDate(doc.dueDate):''}</div>
      <table><tr><th>Description</th><th class="right">Amount</th></tr>
      ${items.map(i=>`<tr><td>${esc(i.name)}</td><td class="right">${fmtMoney(i.price)}</td></tr>`).join('')}
      </table>
      <div class="totals">
        <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Subtotal</span><span>${fmtMoney(t.sub)}</span></div>
        <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>VAT (${doc.vatPercent||0}%)</span><span>${fmtMoney(t.vat)}</span></div>
        <div style="display:flex; justify-content:space-between; padding:8px 0;" class="grand"><span>Total</span><span>${fmtMoney(t.total)}</span></div>
      </div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(), 300);
}

/* ---- Notes ---- */
function tabNotes(c){
  return `
    <div class="card">
      <div class="panel-head"><h3>Internal notes</h3></div>
      <div class="hint" style="margin-bottom:10px;">Visible only to agency staff, never to the client.</div>
      <textarea id="note-input" placeholder="Write a note..." style="min-height:70px; margin-bottom:8px;"></textarea>
      <button class="btn btn-primary btn-sm" onclick="addNote('${c.id}')">Add note</button>
    </div>
    <div style="margin-top:16px;">
      ${c.notes.length ? c.notes.map(n=>`
        <div class="card" style="margin-bottom:10px;">
          <div style="white-space:pre-wrap;">${esc(n.text)}</div>
          <div class="tl-date" style="margin-top:8px;">${esc(n.author)} · ${fmtDate(n.date)}</div>
        </div>
      `).join('') : `<div class="empty"><p>No notes yet.</p></div>`}
    </div>
  `;
}
function addNote(clientId){
  const c = getClient(clientId);
  const el = document.getElementById('note-input');
  const text = el.value.trim();
  if(!text){ toast('Write something first'); return; }
  c.notes.unshift({id:uid(), text, author:'You', date:todayISO()});
  persistAndRender();
  toast('Note added');
}

/* ---- Timeline ---- */
function tabTimeline(c){
  return `
    <div class="card">
      ${c.timeline.length ? c.timeline.map(e=>`
        <div class="tl-item">
          <div class="tl-dot"></div>
          <div>
            <div>${esc(e.text)}</div>
            <div class="tl-date">${fmtDate(e.date)}</div>
          </div>
        </div>
      `).join('') : `<div class="empty"><p>No activity recorded yet.</p></div>`}
    </div>
  `;
}

/* ============================= CROSS-CLIENT VIEWS ============================= */
function viewAllProjects(){
  const rows = allProjects();
  return `
    <div class="card">
      <table>
        <tr><th>Project</th><th>Client</th><th>Status</th><th>Progress</th><th>Due</th></tr>
        ${rows.length ? rows.map(p=>`
          <tr class="clickable" onclick="openClient('${p.clientId}','projects')">
            <td style="font-weight:500;">${esc(p.name)}</td>
            <td>${esc(p.clientName)}</td>
            <td>${statusBadge(p.status)}</td>
            <td><div class="progress-track" style="width:100px;"><div class="progress-fill" style="width:${p.progress||0}%;"></div></div></td>
            <td>${fmtDate(p.dueDate)}</td>
          </tr>
        `).join('') : `<tr><td colspan="5"><div class="empty"><p>No projects yet.</p></div></td></tr>`}
      </table>
    </div>
  `;
}
function viewAllProposals(){
  const rows = allProposals();
  return `
    <div class="card">
      <table>
        <tr><th>Proposal</th><th>Client</th><th>Status</th><th>Value</th><th>Date</th></tr>
        ${rows.length ? rows.map(p=>{const t=withVat(p.services,p.vatPercent); return `
          <tr class="clickable" onclick="openClient('${p.clientId}','proposals')">
            <td style="font-weight:500;">${esc(p.title)}</td>
            <td>${esc(p.clientName)}</td>
            <td>${statusBadge(p.status)}</td>
            <td>${fmtMoney(t.total)}</td>
            <td>${fmtDate(p.date)}</td>
          </tr>
        `}).join('') : `<tr><td colspan="5"><div class="empty"><p>No proposals yet.</p></div></td></tr>`}
      </table>
    </div>
  `;
}
function viewAllInvoices(){
  const rows = allInvoices();
  return `
    <div class="card">
      <table>
        <tr><th>Invoice</th><th>Client</th><th>Status</th><th>Amount</th><th>Due</th></tr>
        ${rows.length ? rows.map(i=>{const t=withVat(i.items,i.vatPercent); return `
          <tr class="clickable" onclick="openClient('${i.clientId}','invoices')">
            <td style="font-weight:500;">${esc(i.title)}</td>
            <td>${esc(i.clientName)}</td>
            <td>${statusBadge(i.status)}</td>
            <td>${fmtMoney(t.total)}</td>
            <td>${fmtDate(i.dueDate)}</td>
          </tr>
        `}).join('') : `<tr><td colspan="5"><div class="empty"><p>No invoices yet.</p></div></td></tr>`}
      </table>
    </div>
  `;
}

/* ============================= TEMPLATES ============================= */
function viewTemplates(){
  // Header + "New template" button live in templates.html
  return `
    ${STATE.templates.map(t=>`
      <div class="card" style="margin-bottom:12px;">
        <div class="panel-head">
          <h3>${esc(t.name)}</h3>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-sm" onclick="openTemplateForm(STATE.templates.find(x=>x.id==='${t.id}'))">Edit</button>
            <button class="btn-danger-text" onclick="deleteTemplate('${t.id}')">Delete</button>
          </div>
        </div>
        <div style="font-weight:500; font-size:13px; margin-bottom:4px;">${esc(t.subject)}</div>
        <div style="color:var(--ink-soft); white-space:pre-wrap; font-size:13px;">${esc(t.body)}</div>
      </div>
    `).join('') || `<div class="empty"><p>No templates yet.</p></div>`}
  `;
}
function openTemplateForm(template){
  openFormModal({
    title: template? 'Edit template' : 'New template',
    fields:[
      {key:'name', label:'Template name', type:'text', required:true},
      {key:'subject', label:'Subject', type:'text', required:true},
      {key:'body', label:'Message', type:'textarea'}
    ],
    initial: template || {},
    onSubmit:(vals)=>{
      if(template) Object.assign(template, vals);
      else STATE.templates.unshift({id:uid(), ...vals});
      saveTemplates(); render(); toast('Template saved');
    },
    onDelete: template ? ()=>{ STATE.templates = STATE.templates.filter(x=>x.id!==template.id); saveTemplates(); render(); } : null
  });
}
function deleteTemplate(id){
  if(!confirm('Delete this template?')) return;
  STATE.templates = STATE.templates.filter(x=>x.id!==id);
  saveTemplates(); render();
}

/* ============================= GENERIC FORM MODAL ============================= */
function closeModal(){ document.getElementById('modal-root').innerHTML = ''; }

function openFormModal({title, fields, initial, onSubmit, onDelete}){
  const root = document.getElementById('modal-root');
  const fieldHtml = fields.map(f=>{
    const val = initial && initial[f.key] != null ? initial[f.key] : '';
    if(f.type==='select'){
      const opts = f.options.map(o=>{
        const value = typeof o === 'object' ? o.value : o;
        const label = typeof o === 'object' ? o.label : o;
        return `<option value="${esc(value)}" ${String(val)===String(value)?'selected':''}>${esc(label)}</option>`;
      }).join('');
      return `<div class="field"><label>${f.label}${f.required?' *':''}</label>
        <select data-key="${f.key}">${f.allowEmpty?`<option value="" ${!val?'selected':''}>${esc(f.allowEmpty)}</option>`:''}${opts}</select></div>`;
    }
    if(f.type==='textarea'){
      return `<div class="field"><label>${f.label}${f.required?' *':''}</label><textarea data-key="${f.key}">${esc(val)}</textarea></div>`;
    }
    return `<div class="field"><label>${f.label}${f.required?' *':''}</label><input type="${f.type}" data-key="${f.key}" value="${esc(val)}"></div>`;
  }).join('');

  root.innerHTML = `
    <div class="modal-veil" onclick="if(event.target===this) closeModal()">
      <div class="modal">
        <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
        <div id="modal-fields">${fieldHtml}</div>
        <div class="modal-actions">
          ${onDelete? `<button class="btn-danger-text" style="margin-right:auto;">Delete</button>` : ''}
          <button class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" id="modal-save">Save</button>
        </div>
      </div>
    </div>
  `;
  if(onDelete){
    root.querySelector('.btn-danger-text').onclick = ()=>{ if(confirm('Delete this? This cannot be undone.')){ closeModal(); onDelete(); } };
  }
  root.querySelector('#modal-save').onclick = ()=>{
    const vals = {};
    let missing = false;
    fields.forEach(f=>{
      const el = root.querySelector(`[data-key="${f.key}"]`);
      const v = el.value;
      if(f.required && !v.trim()){ el.style.outline='2px solid var(--danger)'; missing = true; }
      vals[f.key] = v;
    });
    if(missing){ toast('Fill in the required fields'); return; }
    closeModal();
    onSubmit(vals);
  };
}

/* ============================= LINE-ITEM MODAL (proposals / invoices) ============================= */
function openLineItemModal({title, entity, itemLabel, extraFields, itemsKey, onSubmit, onDelete}){
  const root = document.getElementById('modal-root');
  let items = entity ? entity[itemsKey].map(i=>({...i})) : [{name:'',price:''}];
  let vatPercent = entity ? entity.vatPercent : 15;

  function itemsHtml(){
    return items.map((it,idx)=>`
      <div class="line-item">
        <input type="text" placeholder="${itemLabel} name" value="${esc(it.name)}" oninput="LI_ITEMS[${idx}].name=this.value">
        <input type="number" placeholder="Price" value="${it.price}" oninput="LI_ITEMS[${idx}].price=this.value; renderLineTotals();">
        <button class="icon-btn" onclick="LI_ITEMS.splice(${idx},1); renderLineItems();">✕</button>
      </div>
    `).join('');
  }
  window.LI_ITEMS = items;
  window.renderLineItems = ()=>{
    document.getElementById('li-items').innerHTML = itemsHtml();
    renderLineTotals();
  };
  window.renderLineTotals = ()=>{
    const vp = Number(document.getElementById('li-vat').value || 0);
    const t = withVat(window.LI_ITEMS, vp);
    document.getElementById('li-totals').innerHTML = `
      <div class="totals-row"><span>Subtotal</span><span>${fmtMoney(t.sub)}</span></div>
      <div class="totals-row"><span>VAT (${vp}%)</span><span>${fmtMoney(t.vat)}</span></div>
      <div class="totals-row grand"><span>Total</span><span>${fmtMoney(t.total)}</span></div>
    `;
  };

  const extraHtml = extraFields.map(f=>{
    const val = entity && entity[f.key] != null ? entity[f.key] : (f.key==='status' ? f.options[0] : '');
    if(f.type==='select'){
      return `<div class="field"><label>${f.label}</label><select data-key="${f.key}">${f.options.map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
    }
    if(f.type==='textarea') return `<div class="field"><label>${f.label}</label><textarea data-key="${f.key}">${esc(val)}</textarea></div>`;
    return `<div class="field"><label>${f.label}</label><input type="${f.type}" data-key="${f.key}" value="${esc(val)}"></div>`;
  }).join('');

  root.innerHTML = `
    <div class="modal-veil" onclick="if(event.target===this) closeModal()">
      <div class="modal wide">
        <div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
        <div class="field"><label>Title *</label><input type="text" id="li-title" value="${esc(entity? entity.title:'')}"></div>
        <div class="field"><label>${itemLabel}s</label>
          <div id="li-items">${itemsHtml()}</div>
          <button class="btn btn-sm" onclick="LI_ITEMS.push({name:'',price:''}); renderLineItems();">+ Add ${itemLabel.toLowerCase()}</button>
        </div>
        <div class="field-row">
          <div class="field"><label>VAT %</label><input type="number" id="li-vat" value="${vatPercent}" oninput="renderLineTotals()"></div>
        </div>
        <div class="totals-box" id="li-totals"></div>
        ${extraHtml}
        <div class="modal-actions">
          ${onDelete? `<button class="btn-danger-text" style="margin-right:auto;" id="li-delete">Delete</button>` : ''}
          <button class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" id="li-save">Save</button>
        </div>
      </div>
    </div>
  `;
  renderLineTotals();
  if(onDelete){
    document.getElementById('li-delete').onclick = ()=>{ if(confirm('Delete this? This cannot be undone.')){ closeModal(); onDelete(); } };
  }
  document.getElementById('li-save').onclick = ()=>{
    const titleVal = document.getElementById('li-title').value.trim();
    if(!titleVal){ document.getElementById('li-title').style.outline='2px solid var(--danger)'; toast('Give it a title'); return; }
    const cleanItems = window.LI_ITEMS.filter(i=>i.name.trim()).map(i=>({name:i.name.trim(), price:Number(i.price)||0}));
    if(!cleanItems.length){ toast('Add at least one line item'); return; }
    const vals = {title:titleVal, [itemsKey]:cleanItems, vatPercent:Number(document.getElementById('li-vat').value)||0};
    extraFields.forEach(f=>{ vals[f.key] = root.querySelector(`[data-key="${f.key}"]`).value; });
    closeModal();
    onSubmit(vals);
  };
}

/* ============================= INIT ============================= */
loadState();