// index.js (principal atualizado)
// Ajuste pontual: coleta de destinos simples (origem + destino + paradas)
// SEM impactar estruturas já consolidadas

const LS_KEY = "gti_linhas_db_v1";

const listaEl  = document.getElementById("lista");
const statusEl = document.getElementById("status");
const btnSync  = document.getElementById("btnSync");
const btnClear = document.getElementById("btnClear");
const sDiaEl   = document.getElementById("Sdia");

// select destino existente no HTML
const destinoSelectId = "Destino";

let currentDb = { linhas: [] };

// array final simples para o select
let DESTINOS_UNICOS = [];

/* ======================
   UTIL
====================== */
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ======================
   TIPO DE DIA
   SS = segunda a sexta
   SA = sábado
   DF = domingo e feriados
====================== */
function getTipoDia(date = new Date(), feriados = []) {
  const d = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );

  const diaSemana = d.getDay(); // 0=domingo, 6=sábado
  const dataISO = d.toISOString().slice(0, 10);

  if (diaSemana === 0 || feriados.includes(dataISO)) return "DF";
  if (diaSemana === 6) return "SA";
  return "SS";
}

/* ======================
   COLETA SIMPLES DE DESTINOS
   (origem + destino + paradas)
====================== */
function coletarDestinosUnicos(linhas) {
  const destinos = [];

  const addIfNotExists = (value) => {
    if (!value) return;
    const v = String(value).trim();
    if (v && !destinos.includes(v)) {
      destinos.push(v);
    }
  };

  (linhas || []).forEach(linha => {
    addIfNotExists(linha.origem);
    addIfNotExists(linha.destino);

    if (Array.isArray(linha.paradas)) {
      linha.paradas.forEach(p => addIfNotExists(p));
    }
  });

  return destinos;
}

/* ======================
   RENDERIZAÇÃO LISTA
====================== */
function renderListaLinhas(linhas) {
  if (!listaEl) return;

  listaEl.innerHTML = "";

  if (!linhas || !linhas.length) {
    listaEl.innerHTML = `
      <li class="list-group-item text-center text-muted">
        Nenhuma linha encontrada
      </li>
    `;
    return;
  }

  linhas.forEach((l, i) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item list-group-item-action d-flex justify-content-between align-items-center";

    li.innerHTML = `
      <div>
        <div class="fw-semibold">${escapeHtml(l.empresa || "—")}</div>
        <div class="text-muted small">
          ${escapeHtml(l.origem || "—")} → ${escapeHtml(l.destino || "—")}
        </div>
      </div>
      <span class="badge bg-primary rounded-pill">${i + 1}</span>
    `;

    listaEl.appendChild(li);
  });
}

/* ======================
   RENDERIZAÇÃO SELECT
====================== */
function renderSelectOptions(selectId, items) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";

  const optEmpty = document.createElement("option");
  optEmpty.value = "";
  optEmpty.textContent = "Selecione...";
  select.appendChild(optEmpty);

  (items || []).forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

/* ======================
   DB (localStorage)
====================== */
function getDb() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDb(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

/* ======================
   REFRESH DESTINOS
====================== */
function refreshDestinos() {
  DESTINOS_UNICOS = coletarDestinosUnicos(currentDb.linhas);
}

/* ======================
   AÇÕES
====================== */
async function syncFromJson() {
  setStatus("Sincronizando do db.json...");
  try {
    const res = await fetch("./db.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    currentDb = await res.json();
    saveDb(currentDb);

    refreshDestinos();
    renderSelectOptions(destinoSelectId, DESTINOS_UNICOS);
    renderListaLinhas(currentDb.linhas);

    setStatus("Dados carregados do db.json.");
  } catch {
    setStatus("Erro ao carregar db.json.");

    const cached = getDb();
    if (cached) {
      currentDb = cached;

      refreshDestinos();
      renderSelectOptions(destinoSelectId, DESTINOS_UNICOS);
      renderListaLinhas(currentDb.linhas);

      setStatus("Carregado do localStorage.");
    }
  }
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
  currentDb = { linhas: [] };
  DESTINOS_UNICOS = [];

  renderSelectOptions(destinoSelectId, []);
  renderListaLinhas([]);
  setStatus("Cache limpo.");
}

/* ======================
   INIT
====================== */
function init() {
  // define SS / SA / DF automaticamente
  const tipoHoje = getTipoDia();
  if (sDiaEl) sDiaEl.value = tipoHoje;

  const cached = getDb();
  if (cached) {
    currentDb = cached;

    refreshDestinos();
    renderSelectOptions(destinoSelectId, DESTINOS_UNICOS);
    renderListaLinhas(currentDb.linhas);

    setStatus("Dados carregados do localStorage.");
  } else {
    syncFromJson();
  }

  btnSync?.addEventListener("click", syncFromJson);
  btnClear?.addEventListener("click", clearCache);
}

init();
