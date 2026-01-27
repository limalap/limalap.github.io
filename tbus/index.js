// index.js (principal atualizado)
// Aplicado: renderização de horários por Sdia (SS/SA/DF)
// NOVO: exibe apenas horários dentro da janela de 1h30 antes e 1h30 depois do horário atual
// Impacto mínimo, sem alterar fluxos consolidados

const LS_KEY = "gti_linhas_db_v1";

const listaEl   = document.getElementById("lista");
const statusEl  = document.getElementById("status");
const btnSync   = document.getElementById("btnSync");
const btnClear  = document.getElementById("btnClear");
const sDiaEl    = document.getElementById("Sdia");
const destinoEl = document.getElementById("Destino");

let currentDb = { linhas: [] };

// array simples final para o select
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
====================== */
function getTipoDia(date = new Date(), feriados = []) {
  const d = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diaSemana = d.getDay();
  const dataISO = d.toISOString().slice(0, 10);

  if (diaSemana === 0 || feriados.includes(dataISO)) return "DF";
  if (diaSemana === 6) return "SA";
  return "SS";
}

/* ======================
   COLETA DE DESTINOS
====================== */
function coletarDestinosUnicos(linhas) {
  const destinos = [];

  const addIfNotExists = (value) => {
    if (!value) return;
    const v = String(value).trim();
    if (v && !destinos.includes(v)) destinos.push(v);
  };

  (linhas || []).forEach((linha) => {
    addIfNotExists(linha.origem);
    addIfNotExists(linha.destino);

    if (Array.isArray(linha.paradas)) {
      linha.paradas.forEach((p) => addIfNotExists(p));
    }
  });

  return destinos;
}

/* ======================
   FILTRO POR PARADA
====================== */
function filtrarLinhasPorParada(linhas, destino) {
  if (!destino) return linhas;

  const v = String(destino).trim();

  return (linhas || []).filter((linha) => {
    if (!Array.isArray(linha.paradas)) return false;
    return linha.paradas.some((p) => String(p).trim() === v);
  });
}

/* ======================
   HORÁRIOS (impacto mínimo)
====================== */
function horaParaMinutos(horaStr) {
  const [h, m] = horaStr.split(":").map(Number);
  return h * 60 + m;
}

function minutosAgora() {
  const agora = new Date();
  return agora.getHours() * 60 + agora.getMinutes();
}

function filtrarHorariosPorJanela(horarios, minutosAntes = 90, minutosDepois = 90) {
  const agoraMin = minutosAgora();
  const inicio = agoraMin - minutosAntes;
  const fim = agoraMin + minutosDepois;

  return (horarios || []).filter((h) => {
    const min = horaParaMinutos(h);

    if (inicio >= 0 && fim <= 1440) {
      return min >= inicio && min <= fim;
    }

    if (inicio < 0) {
      return min >= (1440 + inicio) || min <= fim;
    }

    if (fim > 1440) {
      return min >= inicio || min <= (fim - 1440);
    }

    return false;
  });
}

/* ======================
   HORÁRIOS POR DIA
====================== */
function getHorariosPorDia(campo, tipoDia) {
  if (!campo) return [];
  if (Array.isArray(campo)) return campo;
  if (typeof campo === "object") {
    return Array.isArray(campo[tipoDia]) ? campo[tipoDia] : [];
  }
  return [];
}

function montarTextoHorarios(linha, tipoDia) {
  const hO = filtrarHorariosPorJanela(
    getHorariosPorDia(linha.partida_origem, tipoDia)
  );

  const hD = filtrarHorariosPorJanela(
    getHorariosPorDia(linha.partida_destino, tipoDia)
  );

  const origemLabel = linha.origem || "Origem";
  const destinoLabel = linha.destino || "Destino";

  const origemTxt = `${origemLabel}: ${hO.length ? hO.join(" • ") : "—"}`;
  const destinoTxt = `${destinoLabel}: ${hD.length ? hD.join(" • ") : "—"}`;

  return { origemTxt, destinoTxt };
}

/* ======================
   RENDER LISTA
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

  const tipoDia = sDiaEl?.value || "SS";

  linhas.forEach((l, i) => {
    const { origemTxt, destinoTxt } = montarTextoHorarios(l, tipoDia);

    const li = document.createElement("li");
    li.className =
      "list-group-item list-group-item-action d-flex justify-content-between align-items-start";

    li.innerHTML = `
      <div class="me-3">
        <div class="fw-semibold">${escapeHtml(l.empresa || "—")}</div>
        <div class="text-muted small">${escapeHtml(origemTxt)}</div>
        <div class="text-muted small">${escapeHtml(destinoTxt)}</div>
      </div>
      <span class="badge bg-primary rounded-pill">${i + 1}</span>
    `;

    listaEl.appendChild(li);
  });
}

/* ======================
   SELECT
====================== */
function renderSelectOptions(selectId, items) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = "";

  const optEmpty = document.createElement("option");
  optEmpty.value = "";
  optEmpty.textContent = "Selecione...";
  select.appendChild(optEmpty);

  (items || []).forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

/* ======================
   DB
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
   RENDER CENTRAL
====================== */
function renderComFiltrosAtuais() {
  const filtroDestino = destinoEl?.value || "";
  const linhasBase = currentDb.linhas || [];
  const linhasVisiveis = filtrarLinhasPorParada(linhasBase, filtroDestino);
  renderListaLinhas(linhasVisiveis);
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
    renderSelectOptions("Destino", DESTINOS_UNICOS);

    renderComFiltrosAtuais();
    setStatus("Dados carregados do db.json.");
  } catch {
    setStatus("Erro ao carregar db.json.");

    const cached = getDb();
    if (cached) {
      currentDb = cached;

      refreshDestinos();
      renderSelectOptions("Destino", DESTINOS_UNICOS);

      renderComFiltrosAtuais();
      setStatus("Carregado do localStorage.");
    }
  }
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
  currentDb = { linhas: [] };
  DESTINOS_UNICOS = [];

  renderSelectOptions("Destino", []);
  renderListaLinhas([]);
  setStatus("Cache limpo.");
}

/* ======================
   INIT
====================== */
function init() {
  const tipoHoje = getTipoDia();
  if (sDiaEl) sDiaEl.value = tipoHoje;

  const cached = getDb();
  if (cached) {
    currentDb = cached;

    refreshDestinos();
    renderSelectOptions("Destino", DESTINOS_UNICOS);

    renderComFiltrosAtuais();
    setStatus("Dados carregados do localStorage.");
  } else {
    syncFromJson();
  }

  destinoEl?.addEventListener("change", renderComFiltrosAtuais);
  sDiaEl?.addEventListener("change", renderComFiltrosAtuais);

  btnSync?.addEventListener("click", syncFromJson);
  btnClear?.addEventListener("click", clearCache);
}

init();