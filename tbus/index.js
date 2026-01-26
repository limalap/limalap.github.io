// index.js (atualizado) - Bootstrap list-group + tipo do dia (SS/SA/DF) + origens/destinos únicos + render de options no init

const LS_KEY = "gti_linhas_db_v1";

const listaEl  = document.getElementById("lista");
const statusEl = document.getElementById("status");
const btnSync  = document.getElementById("btnSync");
const btnClear = document.getElementById("btnClear");
const sDiaEl   = document.getElementById("Sdia");     // select tipo de dia (SS/SA/DF)

// selects (criados no HTML)
const destinoSelectId = "Destino"; // <select id="Destino" class="form-select"></select>
// se depois quiser também origem: const origemSelectId = "Origem";

let currentDb = { linhas: [] };

// Arrays globais (sempre atualizados)
let ORIGENS_UNICAS = [];
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
  const dataISO = d.toISOString().slice(0, 10); // YYYY-MM-DD

  if (diaSemana === 0 || feriados.includes(dataISO)) return "DF";
  if (diaSemana === 6) return "SA";
  return "SS";
}

/* ======================
   ORIGENS/DESTINOS ÚNICOS
====================== */
function getOrigensDestinosUnicos(linhas) {
  const origens = new Set();
  const destinos = new Set();

  (linhas || []).forEach((l) => {
    if (l?.origem) origens.add(String(l.origem).trim());
    if (l?.destino) destinos.add(String(l.destino).trim());
  });

  return {
    origens: Array.from(origens),
    destinos: Array.from(destinos),
  };
}

/* ======================
   RENDERIZAÇÃO (LISTA)
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
   RENDERIZAÇÃO (OPTIONS SELECT)
   - 1º item: vazio
   - itens simples: value = label = item
====================== */
function renderSelectOptions(selectId, items) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";

  // primeiro option vazio
  const optEmpty = document.createElement("option");
  optEmpty.value = "";
  optEmpty.textContent = "Selecione...";
  select.appendChild(optEmpty);

  // demais options
  (items || []).forEach((item) => {
    const value = String(item ?? "").trim();
    if (!value) return;

    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
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
   REFRESH DE LISTAS ÚNICAS
====================== */
function refreshOrigensDestinos() {
  const { origens, destinos } = getOrigensDestinosUnicos(currentDb.linhas);
  ORIGENS_UNICAS = origens;
  DESTINOS_UNICOS = destinos;
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

    refreshOrigensDestinos();

    // atualiza select de destinos após sync
    renderSelectOptions(destinoSelectId, DESTINOS_UNICOS);

    renderListaLinhas(currentDb.linhas);
    setStatus("Dados carregados do db.json.");
  } catch (err) {
    setStatus("Erro ao carregar db.json.");

    const cached = getDb();
    if (cached) {
      currentDb = cached;

      refreshOrigensDestinos();
      renderSelectOptions(destinoSelectId, DESTINOS_UNICOS);

      renderListaLinhas(currentDb.linhas);
      setStatus("Carregado do localStorage.");
    }
  }
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
  currentDb = { linhas: [] };
  ORIGENS_UNICAS = [];
  DESTINOS_UNICOS = [];

  renderSelectOptions(destinoSelectId, []);
  renderListaLinhas([]);
  setStatus("Cache limpo.");
}

/* ======================
   INIT
====================== */
function init() {
  // seta automaticamente SS/SA/DF no select Sdia
  const tipoHoje = getTipoDia();
  if (sDiaEl) sDiaEl.value = tipoHoje;

  const cached = getDb();
  if (cached) {
    currentDb = cached;

    // executa no init: gera origens/destinos sem repetição
    refreshOrigensDestinos();

    // executa no init: renderiza options do select Destino
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
