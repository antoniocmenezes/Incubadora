// ================== CONFIG ==================
const API = 'http://localhost:3001/api';

// ================== AUTH STORAGE ==================
function token() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function authHeader() {
  const t = token();
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}

// Decodifica o payload do JWT (sem dependências)
function parseJwt(t) {
  try {
    const base = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Retorna o usuário atual (ou null se não houver/expirado)
function currentUser() {
  const t = token();
  if (!t) return null;
  const p = parseJwt(t);
  if (!p) return null;
  if (p.exp && (p.exp * 1000) < Date.now()) {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    return null;
  }
  return { id: p.id, role: p.role, name: p.name };
}

// Renderiza área de autenticação na navbar (#authArea)
function renderAuthArea() {
  const el = document.getElementById('authArea');
  if (!el) return;

  const u = currentUser();
  const savedName = localStorage.getItem('userName');
  const displayName = (u && u.name) || savedName;

  if (u && displayName) {
    el.innerHTML = `
      <div class="dropdown">
        <a class="btn btn-light btn-sm dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-person-circle"></i> ${displayName}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text"><small>Papel: ${u.role || 'Usuário'}</small></span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Sair</a></li>
        </ul>
      </div>
    `;
    const btn = el.querySelector('#logoutBtn');
    if (btn) btn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      window.location.href = 'index.html';
    });
  } else {
    el.innerHTML = `<a href="login.html" class="btn btn-login btn-sm px-3"><i class="bi bi-box-arrow-in-right"></i> Entrar</a>`;
  }
}

// ================== OPEN CALLS ==================
async function loadOpenCalls() {
  const el = document.getElementById('callsList');
  if (!el) return;
  const res = await fetch(`${API}/calls?status=open`);
  const data = await res.json();
  el.innerHTML = data.map(c => `
    <div class="col-md-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${c.title}</h5>
          <p class="card-text">${c.description.substring(0,140)}...</p>
          <span class="badge text-bg-success">Aberto</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ================== LOGIN ==================
function bindLogin() {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('loginMsg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const formData = new FormData(form);
    const payload = { cpf: formData.get('cpf'), password: formData.get('password') };

    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erro ao entrar'; return; }

    // salva token
    setToken(data.token);

    // salva nome (prioriza o que vier no body; senão extrai do JWT)
    if (data.name) {
      localStorage.setItem('userName', data.name);
    } else {
      const p = parseJwt(data.token);
      if (p && p.name) localStorage.setItem('userName', p.name);
    }

    window.location.href = 'index.html';
  });
}

// ================== CALL (ADMIN) ==================
function bindPublishCall() {
  const form = document.getElementById('callForm');
  const msg = document.getElementById('callMsg');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const fd = new FormData(form);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      start_at: fd.get('start_at'),
      end_at: fd.get('end_at')
    };
    const res = await fetch(`${API}/calls`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erro'; msg.classList.replace('text-success','text-danger'); return; }
    msg.textContent = `Publicado! ID ${data.id}`;
    msg.classList.replace('text-danger','text-success');
    form.reset();
  });
}

// ================== PROJECT + SUBMISSION ==================
function bindCreateProjectAndSubmit() {
  const projForm = document.getElementById('projectForm');
  const projMsg = document.getElementById('projMsg');
  const subForm = document.getElementById('submitForm');
  const subMsg = document.getElementById('subMsg');

  if (projForm) {
    projForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      projMsg.textContent = '';
      const fd = new FormData(projForm);
      const payload = {
        title: fd.get('title'),
        summary: fd.get('summary'),
        area: fd.get('area')
      };
      const res = await fetch(`${API}/projects`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) { projMsg.textContent = data.error || 'Erro'; projMsg.classList.replace('text-success','text-danger'); return; }
      projMsg.textContent = `Projeto criado! ID ${data.id}`;
      projMsg.classList.replace('text-danger','text-success');
    });
  }

  if (subForm) {
    subForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      subMsg.textContent = '';
      const fd = new FormData(subForm);
      const payload = {
        project_id: Number(fd.get('project_id')),
        call_id: Number(fd.get('call_id'))
      };
      const res = await fetch(`${API}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) { subMsg.textContent = data.error || 'Erro'; subMsg.classList.replace('text-success','text-danger'); return; }
      subMsg.textContent = `Submissão criada! ID ${data.id}`;
      subMsg.classList.replace('text-danger','text-success');
    });
  }
}

// ================== EVALUATIONS (ADMIN) ==================
function bindEvaluate() {
  const form = document.getElementById('evalForm');
  const msg = document.getElementById('evalMsg');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const fd = new FormData(form);
    const payload = {
      submission_id: Number(fd.get('submission_id')),
      status: fd.get('status'),
      comments: fd.get('comments')
    };
    const res = await fetch(`${API}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erro'; msg.classList.replace('text-success','text-danger'); return; }
    msg.textContent = `Avaliação salva! ID ${data.id}`;
    msg.classList.replace('text-danger','text-success');
    form.reset();
  });
}

async function loadAllCalls({ status = 'all' } = {}) {
  const resp = await fetch(`${API}/calls?status=${encodeURIComponent(status)}&_=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'cache-control': 'no-store' }
  });
  const data = await resp.json();
  renderCalls(data);
}

function renderCalls(calls = []) {
  const el = document.getElementById('callsList');
  if (!el) return;

  if (!Array.isArray(calls) || calls.length === 0) {
    el.innerHTML = `
      <div class="col-12">
        <div class="glass p-4 text-center text-ink-3">Nenhum edital encontrado.</div>
      </div>`;
    return;
  }

  el.innerHTML = calls.map(c => `
    <div class="col-md-6 col-lg-4">
      <a class="text-reset text-decoration-none d-block h-100" href="edital.html?id=${encodeURIComponent(c.id)}">
        <div class="glass card-elev h-100">
          <div class="p-3">
            <h5 class="mb-1">${c.title ?? 'Sem título'}</h5>
            ${c.status   ? `<span class="badge badge-soft">${c.status}</span>` : ''}
            ${c.start_at ? `<div class="small text-ink-3 mt-2"><i class="bi bi-calendar-event"></i> Início: ${new Date(c.start_at).toLocaleDateString()}</div>` : ''}
            ${c.end_at   ? `<div class="small text-ink-3"><i class="bi bi-hourglass-split"></i> Fim: ${new Date(c.end_at).toLocaleDateString()}</div>` : ''}
          </div>
        </div>
      </a>
    </div>
  `).join('');
}

// ================== EDITAL DETAIL ==================
async function initEditalDetail() {
  const container = document.getElementById('editalContainer');
  if (!container) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    container.innerHTML = `<div class="alert alert-warning">Nenhum edital informado.</div>`;
    return;
  }

  try {
    const resp = await fetch(`${API}/calls/${encodeURIComponent(id)}`);
    if (!resp.ok) {
      container.innerHTML = `<div class="alert alert-danger">Edital não encontrado.</div>`;
      return;
    }

    const c = await resp.json();

    container.innerHTML = `
      <h1 class="h3 mb-3">${c.title ?? 'Sem título'}</h1>
      <p class="mb-4">${c.description || ''}</p>

      <ul class="list-unstyled">
        <li> Início: <strong>${c.start_at ? new Date(c.start_at).toLocaleDateString() : '—'}</strong></li>
        <li> Fim: <strong>${c.end_at ? new Date(c.end_at).toLocaleDateString() : '—'}</strong></li>
      </ul>

      <a class="btn btn-brand mt-3 px-4 py-2 d-inline-flex align-items-center gap-2" 
   href="projects_submit.html?callId=${c.id}">
  <i class="bi bi-send"></i> Inscrever meu projeto
</a>

    `;
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="alert alert-danger">Erro ao carregar edital.</div>`;
  }
}

// ================== BOOT ==================
document.addEventListener('DOMContentLoaded', renderAuthArea);

// detecta se está em edital.html e chama a função
if (document.getElementById('editalContainer')) {
  document.addEventListener('DOMContentLoaded', initEditalDetail);
}


// Exporte funções no escopo global, se você as chama direto no HTML
window.loadOpenCalls = loadOpenCalls;
window.bindLogin = bindLogin;
window.bindPublishCall = bindPublishCall;
window.bindCreateProjectAndSubmit = bindCreateProjectAndSubmit;
window.bindEvaluate = bindEvaluate;
window.loadAllCalls = loadAllCalls;

