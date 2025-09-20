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


// injeta / remove o botão "Avaliar" na navbar conforme o papel
function injectAdminNav() {
  const slot = document.getElementById('evalNav');
  if (!slot) return;
  const u = currentUser();

  if (u?.role === 'ADMIN') {
    slot.classList.remove('d-none');
    slot.innerHTML = `
      <a class="nav-link" href="evaluations.html" title="Avaliar projetos">
        <i class="bi bi-clipboard-check"></i> Avaliar Projeto
      </a>
    `;
  } else {
    slot.classList.add('d-none');
    slot.innerHTML = '';
  }
}

// (se quiser revalidar ao trocar de página)
document.addEventListener('DOMContentLoaded', injectAdminNav);


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

  // <- garante o botão de avaliações na navbar conforme o papel
  injectAdminNav();
}



// ================== OPEN CALLS ==================
async function loadOpenCalls() {
  const el = document.getElementById('callsList');
  if (!el) return;
  const res = await fetch(`${API}/calls?status=open`);
  const data = await res.json();
  el.innerHTML = data.map(c => {
    const d = (c.description || '');
    const preview = d.length > 140 ? d.substring(0, 140) + '...' : d;
    return `
      <div class="col-md-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h5 class="card-title">${c.title}</h5>
            <p class="card-text">${preview}</p>
            <span class="badge text-bg-success">Aberto</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Base do servidor (remove o /api do final)
const API_BASE = API.replace(/\/api\/?$/, '');

// Transforma filename ou caminho relativo em URL absoluta
function fileUrl(u) {
  if (!u) return null;
  u = String(u).trim().replace(/\\/g, '/'); // normaliza "\" -> "/"
  if (/^https?:\/\//i.test(u)) return u;                 // já é absoluta
  if (u.startsWith('./')) u = u.slice(2);                // remove "./"
  if (u.startsWith('/')) return API_BASE + u;            // "/uploads/x.png"
  if (u.startsWith('uploads/') || u.startsWith('public/uploads/'))
    return `${API_BASE}/${u}`;                           // "uploads/x.png"
  // se veio só o nome do arquivo, presume pasta /uploads
  return `${API_BASE}/uploads/${u}`;
}

// ============ APROVADOS (HOME) ============
async function loadApprovedProjects() {
  const box = document.getElementById('approvedList');
  if (!box) return;

  try {
    // limpa os placeholders
    box.innerHTML = '';

    // Se a rota for pública, o header vazio não atrapalha
    const res = await fetch(`${API}/publications`, { headers: { ...authHeader() } });
    if (!res.ok) throw new Error('Falha ao carregar publicações');

    const list = await res.json();

    if (!Array.isArray(list) || list.length === 0) {
      box.innerHTML = `<div class="col-12"><p class="text-ink-3">Nenhum projeto aprovado divulgado ainda.</p></div>`;
      return;
    }

    for (const p of list) {
      // tente vários nomes de campo vindos da API
      const rawLogo = p.logo_url ?? p.logo_path ?? p.logo ?? p.logoPath ?? p.logo_file ?? p.logoFilename ?? '';
      const logo = fileUrl(rawLogo) || 'img/logo.png'; // fallback só se realmente não houver
      const title = p.title || 'Projeto aprovado';
      const desc = p.description || p.public_description || '';

      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      col.innerHTML = `
        <div class="glass card-elev h-100 rounded-4 overflow-hidden">
          <div class="ratio ratio-16x9">
            <img src="${logo}" alt="Logo de ${title}" class="w-100 h-100" style="object-fit:cover;">
          </div>
          <div class="p-3">
            <h5 class="mb-1">${title}</h5>
            <p class="text-ink-3 small mb-0">${desc}</p>
          </div>
        </div>
      `;

      box.appendChild(col);
    }
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="col-12"><p class="text-danger">Erro ao carregar projetos aprovados.</p></div>`;
  }
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erro'; msg.classList.replace('text-success', 'text-danger'); return; }
    msg.textContent = `Publicado! ID ${data.id}`;
    msg.classList.replace('text-danger', 'text-success');
    form.reset();
  });
}

// ================== PROJECT + SUBMISSION ==================
function bindCreateProjectAndSubmit() {
  const projForm = document.getElementById('projectForm');
  const projMsg = document.getElementById('projMsg');

  // Lê o callId da URL (?callId=123)
  const params = new URLSearchParams(location.search);
  const callId = params.get('callId') ? Number(params.get('callId')) : null;

  if (!projForm) return;

  projForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    projMsg.textContent = '';
    projMsg.classList.remove('text-danger', 'text-success');

    // Precisa estar logado (token no localStorage)
    if (!token()) {
      projMsg.textContent = 'Você precisa estar logado para criar/submeter.';
      projMsg.classList.add('text-danger');
      return;
    }

    const fd = new FormData(projForm);
    const payload = {
      title: fd.get('title')?.trim(),
      summary: fd.get('summary')?.trim(),
      area: fd.get('area')?.trim()
    };

    // 👇 Adicione isto exatamente aqui (sem duplicar fd/payload)
    if (typeof window.collectTeamFromUI === 'function') {
      const team = window.collectTeamFromUI();
      if (Array.isArray(team) && team.length > 0) {
        payload.team = team;
      }
    }


    try {
      // 1) Cria o projeto
      const res = await fetch(`${API}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        projMsg.textContent = data?.error || 'Erro ao criar projeto';
        projMsg.classList.add('text-danger');
        return;
      }

      const projectId = data.id || data.project_id || data.projectId;
      if (!projectId) {
        projMsg.textContent = 'Projeto criado, mas não retornou ID.';
        projMsg.classList.add('text-danger');
        return;
      }

      // 2) Se a página foi aberta com ?callId=..., submete automaticamente ao edital
      if (callId) {
        const subRes = await fetch(`${API}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ project_id: Number(projectId), call_id: Number(callId) })
        });
        const subData = await subRes.json();

        if (!subRes.ok) {
          // Trata erros comuns de auth/role
          if (subRes.status === 401) {
            projMsg.textContent = 'Não autorizado. Faça login novamente.';
          } else if (subRes.status === 403) {
            projMsg.textContent = 'Ação não permitida. Perfil necessário: ALUNO.';
          } else {
            projMsg.textContent = subData?.error || 'Erro ao submeter ao edital';
          }
          projMsg.classList.add('text-danger');
          return;
        }

        projMsg.textContent = `Projeto criado (ID ${projectId}) e submetido ao edital #${callId}!`;
        projMsg.classList.add('text-success');
        // opcional: redirecionar
        // location.href = `edital.html?id=${callId}`;
      } else {
        // Sem callId na URL: apenas informa o ID criado
        projMsg.textContent = `Projeto criado! ID ${projectId}`;
        projMsg.classList.add('text-success');
      }
    } catch (err) {
      console.error('submit project error', err);
      projMsg.textContent = 'Falha inesperada ao criar/submeter.';
      projMsg.classList.add('text-danger');
    }
    // Dentro do sucesso da submissão:
projForm.classList.add('d-none');        // esconde o formulário
document.getElementById('successMessage').classList.remove('d-none'); // mostra mensagem

  });
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
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || 'Erro'; msg.classList.replace('text-success', 'text-danger'); return; }
    msg.textContent = `Avaliação salva! ID ${data.id}`;
    msg.classList.replace('text-danger', 'text-success');
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
            ${c.status ? `<span class="badge badge-soft">${c.status}</span>` : ''}
            ${c.start_at ? `<div class="small text-ink-3 mt-2"><i class="bi bi-calendar-event"></i> Início: ${new Date(c.start_at).toLocaleDateString()}</div>` : ''}
            ${c.end_at ? `<div class="small text-ink-3"><i class="bi bi-hourglass-split"></i> Fim: ${new Date(c.end_at).toLocaleDateString()}</div>` : ''}
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

// ===== ROLES & NAVIGATION para publicação de aprovados =====
function currentRole() {
  const u = currentUser?.();
  return u?.role || null; // "ADMIN" ou "ALUNO"
}

function goPublishApproved(projectId, submissionId) {
  const qs = new URLSearchParams({
    projectId: projectId ?? '',
    submissionId: submissionId ?? ''
  });
  location.href = 'publish_approved.html?' + qs.toString();
}

// ===== PUBLISH APPROVED (ADMIN) =====
// Handler chamado em publish_approved.html
function bindPublishApproved() {
  const form = document.getElementById('pubForm');
  const msg = document.getElementById('pubMsg');
  if (!form) return;

  // lê parâmetros ?projectId=&submissionId= da URL para pré-preencher
  const url = new URL(location.href);
  const qsProjectId = url.searchParams.get('projectId');
  const qsSubmissionId = url.searchParams.get('submissionId');

  const projInput = form.querySelector('[name="project_id"]');
  if (qsProjectId && projInput) projInput.value = qsProjectId;

  // opcional: manter submissionId em campo oculto se quiser enviar para auditoria
  if (qsSubmissionId && !form.querySelector('[name="submission_id"]')) {
    const hid = document.createElement('input');
    hid.type = 'hidden';
    hid.name = 'submission_id';
    hid.value = qsSubmissionId;
    form.appendChild(hid);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (msg) { msg.textContent = ''; msg.className = 'ms-2 small'; }

    // exige login ADMIN
    if (currentRole() !== 'ADMIN') {
      if (msg) { msg.textContent = 'Apenas ADMIN pode publicar.'; msg.classList.add('text-danger'); }
      return;
    }

    try {
      const fd = new FormData(form); // envia multipart (logo incluso)
      const res = await fetch(`${API}/publications`, {
        method: 'POST',
        headers: { ...authHeader() }, // rota protegida
        body: fd
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (msg) { msg.textContent = data?.error || 'Erro ao publicar'; msg.classList.add('text-danger'); }
        return;
      }

      if (msg) { msg.textContent = `Publicado! ID ${data?.id ?? ''}`; msg.classList.add('text-success'); }
      // volta pra home, na seção dos aprovados
      location.href = 'index.html#aprovados';
    } catch (err) {
      console.error(err);
      if (msg) { msg.textContent = 'Falha inesperada ao publicar.'; msg.classList.add('text-danger'); }
    }
  });
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
window.bindPublishApproved = bindPublishApproved;
window.goPublishApproved = goPublishApproved;

