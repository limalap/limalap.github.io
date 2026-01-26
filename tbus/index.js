const LS_KEY = "gti_linhas_db_v1";

const listaEl  = document.getElementById("lista");
const statusEl = document.getElementById("status");
const btnSync  = document.getElementById("btnSync");
const btnClear = document.getElementById("btnClear");
const searchEl = document.getElementById("search"); // opcional

let currentDb = { linhas: [] };

/* util */
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

function normalize(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/* renderização (função específica) */
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
    li.className = "list-group-item d-flex justify-content-between align-items-center";

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

/* dados */
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

function filterLinhas(linhas, q) {
  const query = normalize(q).trim();
  if (!query) return linhas;

  return linhas.filter(l =>
    normalize(`${l.empresa} ${l.origem} ${l.destino}`).includes(query)
  );
}

/* ações */
async function syncFromJson() {
  setStatus("Sincronizando do db.json...");
  try {
    const res = await fetch("./db.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    currentDb = await res.json();
    saveDb(currentDb);

    const filtradas = filterLinhas(currentDb.linhas, searchEl?.value || "");
    renderListaLinhas(filtradas);

    setStatus("Dados carregados do db.json.");
  } catch (err) {
    setStatus("Erro ao carregar db.json.");

    const cached = getDb();
    if (cached) {
      currentDb = cached;
      renderListaLinhas(filterLinhas(currentDb.linhas, searchEl?.value || ""));
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

/* init */
function init() {
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

  searchEl?.addEventListener("input", e => {
    renderListaLinhas(
      filterLinhas(currentDb.linhas, e.target.value)
    );
  });
}

init();
