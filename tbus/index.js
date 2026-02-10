// index.js (principal atualizado)
// Correção aplicada:
// - ao sincronizar, limpa filtros ativos
// - renderiza TODAS as linhas após o sync
// - evita reaplicação silenciosa de filtros antigos

const LS_KEY = "gti_linhas_db_v1";

const listaEl   = document.getElementById("lista");
const statusEl  = document.getElementById("status");
const btnSync   = document.getElementById("btnSync");
const btnClear  = document.getElementById("btnClear");
const sDiaEl    = document.getElementById("Sdia");
const destinoEl = document.getElementById("Destino");

let currentDb = { linhas: [] };
let DESTINOS_UNICOS = [];

function renderSelectOptions(selectId, options) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = `<option value="">Todos</option>`;

  (options || []).forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  });
}

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

function filtrarHorariosPorUltimosEProximos(horarios, qtdPassados = 2, qtdFuturos = 2) {
  const agoraMin = minutosAgora();

  const ordenados = (horarios || [])
    .filter(Boolean)
    .map(String)
    .filter((h) => /^\d{2}:\d{2}$/.test(h))
    .sort((a, b) => horaParaMinutos(a) - horaParaMinutos(b));

  const passados = [];
  const futuros = [];

  for (const h of ordenados) {
    const min = horaParaMinutos(h);
    if (min < agoraMin) passados.push(h);
    else futuros.push(h);
  }

  return [...passados.slice(-qtdPassados), ...futuros.slice(0, qtdFuturos)];
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
   TEXTO DOS HORÁRIOS
====================== */
function montarHorariosFormatados(horarios) {
  const agoraMin = minutosAgora();

  return horarios.map((h) => {
    const min = horaParaMinutos(h);
    return min < agoraMin
      ? `<strong style="color:#556B2F">${escapeHtml(h)}</strong>`
      : `<span style="color:#4FA3D1">${escapeHtml(h)}</span>`;
  }).join(" • ");
}

function montarTextoHorarios(linha, tipoDia) {
  const hO = filtrarHorariosPorUltimosEProximos(
    getHorariosPorDia(linha.partida_origem, tipoDia)
  );

  const hD = filtrarHorariosPorUltimosEProximos(
    getHorariosPorDia(linha.partida_destino, tipoDia)
  );

  const tituloIda = `${escapeHtml(linha.origem)} → ${escapeHtml(linha.destino)}`;
  const tituloVolta = `${escapeHtml(linha.destino)} → ${escapeHtml(linha.origem)}`;

  return {
    origemTxt: `<span class="fw-semibold">${tituloIda}</span><br>${montarHorariosFormatados(hO) || "—"}`,
    destinoTxt: `<span class="fw-semibold">${tituloVolta}</span><br>${montarHorariosFormatados(hD) || "—"}`
  };
}

/* ======================
   RENDER
====================== */
function renderListaLinhas(linhas) {
  listaEl.innerHTML = "";

  if (!linhas || !linhas.length) {
    listaEl.innerHTML = `<li class="list-group-item text-center text-muted">Nenhuma linha encontrada</li>`;
    return;
  }

  const tipoDia = sDiaEl?.value || "SS";

  linhas.forEach((l, i) => {
    const { origemTxt, destinoTxt } = montarTextoHorarios(l, tipoDia);

    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-start";

    li.innerHTML = `
      <div>
        <div class="fw-semibold">${escapeHtml(l.empresa)}</div>
        <div class="text-muted small">${origemTxt}</div>
        <div class="text-muted small">${destinoTxt}</div>
      </div>
      <span class="badge bg-primary rounded-pill">${i + 1}</span>
    `;

    listaEl.appendChild(li);
  });
}

/* ======================
   DB
====================== */
function getDb() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY));
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
  const filtro = destinoEl?.value || "";
  renderListaLinhas(filtrarLinhasPorParada(currentDb.linhas, filtro));
}

function noCache(url) {
  return `${url}?_ts=${Date.now()}`;
}

/* ======================
   SYNC MULTI (CORRIGIDO)
====================== */
async function syncFromJsonMulti() {
  setStatus("Sincronizando dados...");

  const resMain = await fetch(noCache("./db_main.json"), { cache: "no-store" });
  const main = await resMain.json();

  const resultados = await Promise.all(
    main.arquivos.map(async (path) => {
      const res = await fetch(noCache(path), { cache: "no-store" });
      const json = await res.json();
      return json.linhas || [];
    })
  );

  currentDb = { linhas: resultados.flat() };
  saveDb(currentDb);

  refreshDestinos();
  renderSelectOptions("Destino", DESTINOS_UNICOS);

  // ✅ CORREÇÃO CRÍTICA
  if (destinoEl) destinoEl.value = "";

  renderListaLinhas(currentDb.linhas);
  setStatus(`Dados carregados (${currentDb.linhas.length} linhas).`);
}

/* ======================
   INIT
====================== */
function init() {
  sDiaEl.value = getTipoDia();

  const cached = getDb();
  if (cached) {
    currentDb = cached;
    refreshDestinos();
    renderSelectOptions("Destino", DESTINOS_UNICOS);
    renderListaLinhas(currentDb.linhas);
    setStatus("Dados carregados do cache.");
  } else {
    syncFromJsonMulti();
  }

  destinoEl.addEventListener("change", renderComFiltrosAtuais);
  sDiaEl.addEventListener("change", renderComFiltrosAtuais);
  btnSync.addEventListener("click", syncFromJsonMulti);
  btnClear.addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    location.reload();
  });
}

init();
