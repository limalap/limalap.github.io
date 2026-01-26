const LS_KEY = "gti_linhas_db_v1";
const listaEl = document.getElementById("lista");
const statusEl = document.getElementById("status");
const btnSync = document.getElementById("btnSync");
const btnClear = document.getElementById("btnClear");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function getDbFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDbToLocalStorage(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

function renderLinhas(db) {
  listaEl.innerHTML = "";

  const linhas = db?.linhas || [];
  if (!linhas.length) {
    listaEl.innerHTML = "<li>Nenhuma linha encontrada.</li>";
    return;
  }

  for (const l of linhas) {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${escapeHtml(l.empresa || "—")}</strong>
      <div class="meta">${escapeHtml(l.origem || "—")} → ${escapeHtml(l.destino || "—")}</div>
    `;
    listaEl.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function syncFromJson() {
  setStatus("Carregando db.json...");
  try {
    // db.json precisa estar no mesmo diretório, servido por HTTP (não file://)
    const res = await fetch("./db.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const db = await res.json();

    saveDbToLocalStorage(db);
    renderLinhas(db);
    setStatus("Sincronizado e salvo no localStorage.");
  } catch (err) {
    setStatus(`Falha ao carregar db.json: ${err.message}`);
    // fallback: tenta renderizar do cache
    const cached = getDbFromLocalStorage();
    if (cached) renderLinhas(cached);
  }
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
  renderLinhas({ linhas: [] });
  setStatus("Cache limpo.");
}

function init() {
  // 1) tenta cache
  const cached = getDbFromLocalStorage();
  if (cached) {
    renderLinhas(cached);
    setStatus("Carregado do localStorage.");
  } else {
    // 2) se não tem cache, sincroniza
    syncFromJson();
  }

  btnSync.addEventListener("click", syncFromJson);
  btnClear.addEventListener("click", clearCache);
}

init();
