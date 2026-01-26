const LS_KEY = "gti_linhas_db_v1";

const listaEl  = document.getElementById("lista");
const statusEl = document.getElementById("status");
const btnSync  = document.getElementById("btnSync");
const btnClear = document.getElementById("btnClear");
const sDiaEl   = document.getElementById("Sdia");

let currentDb = { linhas: [] };

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
   RENDERIZAÇÃO (ESPECÍFICA)
====================== */
function renderListaLinhas(linhas) {
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
   DADOS
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
   AÇÕES
====================== */
async function syncFromJson() {
  setStatus("Sincronizando do db.json...");
  try {
    const res = await fetch("./db.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    currentDb = await res.json();
    saveDb(currentDb);
    renderListaLinhas(currentDb.linhas);
    setStatus("Dados carregados do db.json.");
  } catch (err) {
    setStatus("Erro ao carregar db.json.");

    const cached = getDb();
    if (cached) {
      currentDb = cached;
      renderListaLinhas(currentDb.linhas);
      setStatus("Carregado do localStorage.");
    }
  }
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
  currentDb = { linhas: [] };
  renderListaLinhas([]);
  setStatus("Cache limpo.");
}

/* ======================
   INIT
====================== */
function init() {
  // define automaticamente SS / SA / DF
  const tipoHoje = getTipoDia();
  if (sDiaEl) sDiaEl.value = tipoHoje;

  const cached = getDb();
  if (cached) {
    currentDb = cached;
    renderListaLinhas(currentDb.linhas);
    setStatus("Dados carregados do localStorage.");
  } else {
    syncFromJson();
  }

  btnSync?.addEventListener("click", syncFromJson);
  btnClear?.addEventListener("click", clearCache);
}

init();
