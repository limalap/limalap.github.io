// index.js (completo) - lista Bootstrap (list-group) + cache localStorage + sync db.json + busca

const LS_KEY = "gti_linhas_db_v1";

const listaEl  = document.getElementById("lista");
const statusEl = document.getElementById("status");
const btnSync  = document.getElementById("btnSync");
const btnClear = document.getElementById("btnClear");
const searchEl = document.getElementById("search"); // opcional (se existir no HTML)

let currentDb = { linhas: [] };

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

function normalize(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function filterLinhas(linhas, q) {
  const query = normalize(q).trim();
  if (!query) return linhas;

  return linhas.filter((l) => {
    const hay = normalize(`${l.empresa} ${l.origem} ${l.destino}`);
    return hay.includes(query);
  });
}

function renderLinhas(db, query = "") {
  listaEl.innerHTML = "";

  const linhasAll = db?.linhas || [];
  const linhas = filterLinhas(linhasAll, query);

  if (!linhas.length) {
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

    // opcional: clique no item (placeholder para abrir detalhes depois)
    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      // aqui você pode redirecionar, abrir modal, etc.
      console.log("Linha clicada:", l);
    });

    listaEl.appendChild(li);
  });
}

async function syncFromJson() {
  setStatus("Sincronizando do db.json...");
  try {
    const res = await fetch("./db.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const db = await res.json();
    currentDb = db || { linhas: [] };

    saveDb(currentDb);
    renderLinhas(currentDb, searchEl?.value || "");
    setStatus("Dados carregados do db.json e salvos no localStorage.");
  } catch (err) {
    setStatus(`Falha ao carregar db.json: ${err.message}`);

    // fallback: tenta cache
    const cached = getDb();
    if (cached) {
      currentDb = cached;
      renderLinhas(currentDb, searchEl?.value || "");
      setStatus("Carregado do localStorage (fallback).");
    }
  }
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
  currentDb = { linhas: [] };
  renderLinhas(currentDb, searchEl?.value || "");
  setStatus("Cache limpo.");
}

function init() {
  // 1) tenta cache
  const cached = getDb();
  if (cached) {
    currentDb = cached;
    renderLinhas(currentDb, "");
    setStatus("Dados carregados do localStorage.");
  } else {
    // 2) se não tem cache, sincroniza
    syncFromJson();
  }

  btnSync?.addEventListener("click", syncFromJson);
  btnClear?.addEventListener("click", clearCache);

  // busca (se existir input#search no HTML)
  searchEl?.addEventListener("input", (e) => {
    renderLinhas(currentDb, e.target.value);
  });
}

init();
