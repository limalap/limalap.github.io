// index.js (principal atualizado)
// Aplicado:
// - filtro: 2 últimos horários que já partiram + 2 próximos a partir
// - exibição (Opção A): "Origem → Destino" em uma linha + horários na linha abaixo
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

// (mantida por compatibilidade; não usada no novo cálculo)
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

// 2 últimos passados + 2 próximos futuros
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

  const ultimosPassados = passados.slice(-qtdPassados);
  const proximosFuturos = futuros.slice(0, qtdFuturos);

  return [...ultimosPassados, ...proximosFuturos];
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
  const hO = filtrarHorariosPorUltimosEProximos(
    getHorariosPorDia(linha.partida_origem, tipoDia),
    2,
    2
  );

  const hD = filtrarHorariosPorUltimosEProximos(
    getHorariosPorDia(linha.partida_destino, tipoDia),
    2,
    2
  );

  const origemLabel = linha.origem || "Origem";
  const destinoLabel = linha.destino || "Destino";

  // Opção A: "Origem → Destino" + horários na linha abaixo
  const tituloIda = `${escapeHtml(origemLabel)} → ${escapeHtml(destinoLabel)}`;
  const tituloVolta = `${escapeHtml(destinoLabel)} → ${escapeHtml(origemLabel)}`;

  const horariosIda = hO.length ? montarHorariosFormatados(hO) : "—";
  const horariosVolta = hD.length ? montarHorariosFormatados(hD) : "—";

  const origemTxt = `<span class="fw-semibold">${tituloIda}</span><br>${horariosIda}`;
  const destinoTxt = `<span class="fw-semibold">${tituloVolta}</span><br>${horariosVolta}`;

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

function noCache(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_ts=${Date.now()}`;
}


async function syncFromJsonMulti() {
  console.group("🔄 syncFromJsonMulti");
  console.time("⏱ tempo total");
  setStatus("Sincronizando múltiplos arquivos (sem cache)...");

  try {
    /* ======================
       1) db_main.json
    ====================== */
    console.log("1️⃣ Carregando db_main.json");

    const resMain = await fetch(noCache("./db_main.json"), {
      cache: "no-store"
    });

    if (!resMain.ok) {
      console.error("❌ Falha HTTP db_main.json", resMain.status);
      throw new Error("Erro HTTP db_main.json");
    }

    const main = await resMain.json();
    console.log("✅ db_main.json carregado:", main);

    if (!Array.isArray(main.arquivos) || !main.arquivos.length) {
      console.error("❌ 'arquivos' inválido em db_main.json", main);
      throw new Error("Lista de arquivos inválida");
    }

    const arquivos = main.arquivos;
    console.log("📄 Arquivos a carregar:", arquivos);

    /* ======================
       2) arquivos individuais
    ====================== */
    const resultados = await Promise.all(
      arquivos.map(async (path, index) => {
        console.group(`📦 Arquivo ${index + 1}: ${path}`);

        try {
          const res = await fetch(noCache(path), {
            cache: "no-store"
          });

          if (!res.ok) {
            console.error("❌ Falha HTTP", res.status);
            throw new Error(`Erro HTTP ${res.status}`);
          }

          const json = await res.json();

          if (!Array.isArray(json.linhas)) {
            console.error("❌ Campo 'linhas' inválido", json);
            throw new Error("Formato inválido");
          }

          console.log(`✅ ${json.linhas.length} linhas carregadas`);
          console.groupEnd();
          return json.linhas;
        } catch (err) {
          console.error("🔥 Erro ao carregar arquivo:", path, err);
          console.groupEnd();
          throw err;
        }
      })
    );

    /* ======================
       3) merge
    ====================== */
    const linhas = resultados.flat();
    console.log("🧩 Merge concluído. Total de linhas:", linhas.length);

    /* ======================
       4) persistência
    ====================== */
    currentDb = { linhas };
    saveDb(currentDb);

    console.log("💾 DB salvo no localStorage");

    refreshDestinos();
    renderSelectOptions("Destino", DESTINOS_UNICOS);
    renderComFiltrosAtuais();

    console.log("🖥 Renderização concluída");
    setStatus(`Dados carregados com sucesso (${linhas.length} linhas).`);
  } catch (err) {
    console.error("💥 ERRO GERAL syncFromJsonMulti", err);

    const cached = getDb();
    if (cached) {
      console.warn("⚠️ Usando cache local");
      currentDb = cached;
      refreshDestinos();
      renderSelectOptions("Destino", DESTINOS_UNICOS);
      renderComFiltrosAtuais();
      setStatus("Falha na sincronização. Usando cache local.");
    } else {
      setStatus("Erro crítico ao carregar dados.");
    }
  } finally {
    console.timeEnd("⏱ tempo total");
    console.groupEnd();
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
    //syncFromJson();
    syncFromJsonMulti();
  }

  destinoEl?.addEventListener("change", renderComFiltrosAtuais);
  sDiaEl?.addEventListener("change", renderComFiltrosAtuais);
  btnSync?.addEventListener("click", syncFromJson);
  btnClear?.addEventListener("click", clearCache);
}

init();
