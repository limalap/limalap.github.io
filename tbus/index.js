// index.js (principal atualizado)
// Aplicado:
// - janela de 1h30 antes e depois
// - diferenciação visual de horários já passados e futuros
// Impacto mínimo, sem alterar estruturas consolidadas

const LS_KEY = "gti_linhas_db_v1";

const listaEl   = document.getElementById("lista");
const statusEl  = document.getElementById("status");
const btnSync   = document.getElementById("btnSync");
const btnClear  = document.getElementById("btnClear");
const sDiaEl    = document.getElementById("Sdia");
const destinoEl = document.getElementById("Destino");

let currentDb = { linhas: [] };
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
   DESTINOS
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

function filtrarLinhasPorParada(linhas, destino) {
  if (!destino) return linhas;
  const v = String(destino).trim();

  return (linhas || []).filter((linha) =>
    Array.isArray(linha.paradas) &&
    linha.paradas.some((p) => String(p).trim() === v)
  );
}

/* ======================
   HORÁRIOS
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

    if (inicio >= 0 && fim <= 1440) return min >= inicio && min <= fim;
    if (inicio < 0) return min >= (1440 + inicio) || min <= fim;
    if (fim > 1440) return min >= inicio || min <= (fim - 1440);

    return false;
  });
}

function getHorariosPorDia(campo, tipoDia) {
  if (!campo) return [];
  if (Array.isArray(campo)) return campo;
  if (typeof campo === "object") {
    return Array.isArray(campo[tipoDia]) ? campo[tipoDia] : [];
  }
  return [];
}

/* ======================
   TEXTO DOS HORÁRIOS (visual)
====================== */
function montarHorariosFormatados(horarios) {
  const agoraMin = minutosAgora();

  return horarios.map((h) => {
    const min = horaParaMinutos(h);

    // verde oliva militar (já saiu)
    if (min < agoraMin) {
      return `<strong style="color:#556B2F">${escapeHtml(h)}</strong>`;
    }

    // azul celeste (ainda não saiu)
    return `<span style="color:#4FA3D1">${escapeHtml(h)}</span>`;
  }).join(" • ");
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

  const origemTxt = `${escapeHtml(origemLabel)}: ${
    hO.length ? montarHorariosFormatados(hO) : "—"
  }`;

  const destinoTxt = `${escapeHtml(destinoLabel)}: ${
    hD.length ? montarHorariosFormatados(hD) : "—"
  }`;

  return { origemTxt, destinoTxt };
}

/* ======================
   RENDER
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
        <div class="text-muted small">${origemTxt}</div>
        <div class="text-muted small">${destinoTxt}</div>
      </div>
      <span class="badge bg-primary rounded-pill">${i + 1}</span>
    `;

    listaEl.appendChild(li);
  });
}

/* ======================
   SELECT / DB / INIT
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

function refreshDestinos() {
  DESTINOS_UNICOS = coletarDestinosUnicos(currentDb.linhas);
}

function renderComFiltrosAtuais() {
  const filtroDestino = destinoEl?.value || "";
  const linhasVisiveis = filtrarLinhasPorParada(currentDb.linhas || [], filtroDestino);
  renderListaLinhas(linhasVisiveis);
}

async function syncFromJson() {
  setStatus("Sincronizando do db.json...");
  try {
    const res = await fetch("./db.json", { cache: "no-store" });
    if (!res.ok) throw new Error();

    currentDb = await res.json();
    saveDb(currentDb);

    refreshDestinos();
    renderSelectOptions("Destino", DESTINOS_UNICOS);
    renderComFiltrosAtuais();
    setStatus("Dados carregados do db.json.");
  } catch {
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

function init() {
  if (sDiaEl) sDiaEl.value = getTipoDia();

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