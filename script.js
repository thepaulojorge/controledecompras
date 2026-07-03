// =============================================
// ESTADO GLOBAL
// =============================================
let viagens      = JSON.parse(localStorage.getItem("viagens"))      || [];
let viagemAtualId= localStorage.getItem("viagemAtualId")             || null;
let taxas        = JSON.parse(localStorage.getItem("taxas"))         || {};
let moedasAtivas = JSON.parse(localStorage.getItem("moedasAtivas"))  || ["USD", "BRL"];
let limiteUSD    = parseFloat(localStorage.getItem("limiteUSD"))     || 1000;
let tema         = localStorage.getItem("tema")                      || "default";
let editandoId   = null;
let alertaDisparado = false;
let toastTimer   = null;
let fotoBase64   = null;

// Moedas disponíveis
const MOEDAS_DISPONIVEIS = [
  { code: "USD", label: "Dólar (USD)", simbolo: "$" },
  { code: "BRL", label: "Real (BRL)",  simbolo: "R$" },
  { code: "EUR", label: "Euro (EUR)",  simbolo: "€" },
  { code: "GBP", label: "Libra (GBP)", simbolo: "£" },
  { code: "ARS", label: "Peso AR (ARS)", simbolo: "$" },
  { code: "KRW", label: "Won (KRW)",   simbolo: "₩" },
  { code: "CNY", label: "Yuan (CNY)",  simbolo: "¥" },
  { code: "CAD", label: "Dólar CA (CAD)", simbolo: "CA$" },
];

// Taxas padrão (fallback offline)
const TAXAS_PADRAO = { USD: 0.0065, BRL: 0.034, EUR: 0.006, GBP: 0.005, ARS: 5.9, KRW: 8.7, CNY: 0.047, CAD: 0.009 };

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  aplicarTema(tema);
  inicializarViagens();
  renderizarCheckboxMoedas();
  buscarTaxas();
  bindEventos();
  abaAtiva("compras");
});

// =============================================
// VIAGENS
// =============================================
function inicializarViagens() {
  if (viagens.length === 0) {
    const id = criarViagemObj("Japão 2028", "Tóquio, Osaka");
    viagens.push(id);
    salvarViagens();
    viagemAtualId = id.id;
    localStorage.setItem("viagemAtualId", viagemAtualId);
  }
  if (!viagemAtualId || !viagens.find(v => v.id === viagemAtualId)) {
    viagemAtualId = viagens[0].id;
    localStorage.setItem("viagemAtualId", viagemAtualId);
  }
  renderizarSidebar();
  atualizarHeaderViagem();
  atualizarTabela();
}

function criarViagemObj(nome, destino) {
  return { id: gerarId(), nome, destino, compras: [], desejos: [] };
}

function viagemAtual() {
  return viagens.find(v => v.id === viagemAtualId);
}

function renderizarSidebar() {
  const lista = document.getElementById("listaViagens");
  lista.innerHTML = "";
  viagens.forEach(v => {
    const item = document.createElement("div");
    item.className = "viagem-item" + (v.id === viagemAtualId ? " ativa" : "");
    item.innerHTML = `
      <div>
        <div class="viagem-item-nome">${escapeHTML(v.nome)}</div>
        <div class="viagem-item-sub">${escapeHTML(v.destino || "")} · ${v.compras.length} item(s)</div>
      </div>
      <button class="btn-del-viagem" data-id="${v.id}" title="Excluir viagem">🗑</button>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.closest(".btn-del-viagem")) return;
      trocarViagem(v.id);
    });
    item.querySelector(".btn-del-viagem").addEventListener("click", () => excluirViagem(v.id));
    lista.appendChild(item);
  });
}

function trocarViagem(id) {
  viagemAtualId = id;
  localStorage.setItem("viagemAtualId", id);
  alertaDisparado = false;
  editandoId = null;
  resetarForm();
  renderizarSidebar();
  atualizarHeaderViagem();
  atualizarTabela();
  renderizarWishlist();
  fecharSidebar();
  mostrarToast("Viagem carregada!", "sucesso");
}

function atualizarHeaderViagem() {
  const v = viagemAtual();
  if (!v) return;
  document.getElementById("nomeViagem").textContent = v.nome;
  document.getElementById("subViagem").textContent = v.destino || "Controle de Compras";
}

function excluirViagem(id) {
  if (viagens.length === 1) { mostrarToast("Você precisa ter pelo menos uma viagem.", "alerta"); return; }
  if (!confirm("Excluir esta viagem e todas as suas compras?")) return;
  viagens = viagens.filter(v => v.id !== id);
  salvarViagens();
  if (viagemAtualId === id) {
    viagemAtualId = viagens[0].id;
    localStorage.setItem("viagemAtualId", viagemAtualId);
  }
  renderizarSidebar();
  atualizarHeaderViagem();
  atualizarTabela();
}

function salvarViagens() {
  localStorage.setItem("viagens", JSON.stringify(viagens));
}

// =============================================
// TAXAS DE CÂMBIO
// =============================================
const taxaInfoEl    = document.getElementById("taxaInfo");
const btnAtualizar  = document.getElementById("btnAtualizarTaxa");

async function buscarTaxas() {
  taxaInfoEl.textContent = "Buscando taxas...";
  btnAtualizar.disabled = true;
  const apis = [
    { url: "https://open.er-api.com/v6/latest/JPY",          parse: d => d.rates },
    { url: "https://api.exchangerate-api.com/v4/latest/JPY", parse: d => d.rates },
  ];
  for (const api of apis) {
    try {
      const res = await fetch(api.url);
      if (!res.ok) continue;
      const data = await res.json();
      const rates = api.parse(data);
      if (!rates || !rates.USD) continue;
      taxas = rates;
      localStorage.setItem("taxas", JSON.stringify(taxas));
      taxaInfoEl.textContent = `¥1 = $${rates.USD.toFixed(5)} | R$${rates.BRL.toFixed(4)} (ao vivo)`;
      mostrarToast("Taxas atualizadas!", "sucesso");
      btnAtualizar.disabled = false;
      atualizarCalculadora();
      return;
    } catch (_) {}
  }
  // Fallback
  if (Object.keys(taxas).length === 0) taxas = TAXAS_PADRAO;
  taxaInfoEl.textContent = `¥1 = $${(taxas.USD||0).toFixed(5)} | R$${(taxas.BRL||0).toFixed(4)} (offline)`;
  mostrarToast("Usando taxas salvas.", "info");
  btnAtualizar.disabled = false;
}

function converterJPY(jpy) {
  const resultado = {};
  MOEDAS_DISPONIVEIS.forEach(m => {
    const taxa = taxas[m.code] || TAXAS_PADRAO[m.code] || 0;
    resultado[m.code] = parseFloat((jpy * taxa).toFixed(2));
  });
  return resultado;
}

function taxaParaMoeda(code) {
  return taxas[code] || TAXAS_PADRAO[code] || 0;
}

function simbolo(code) {
  return MOEDAS_DISPONIVEIS.find(m => m.code === code)?.simbolo || code;
}

// =============================================
// MOEDAS CONFIGURÁVEIS
// =============================================
function renderizarCheckboxMoedas() {
  const wrap = document.getElementById("checkboxMoedas");
  wrap.innerHTML = "";
  MOEDAS_DISPONIVEIS.forEach(m => {
    const label = document.createElement("label");
    label.className = "checkbox-moeda";
    label.innerHTML = `
      <input type="checkbox" value="${m.code}" ${moedasAtivas.includes(m.code) ? "checked" : ""}>
      <span>${m.simbolo} ${m.label}</span>
    `;
    wrap.appendChild(label);
  });
}

// =============================================
// FOTO
// =============================================
const fotoInput    = document.getElementById("fotoItem");
const labelFoto    = document.getElementById("labelFoto");
const btnRemFoto   = document.getElementById("btnRemoverFoto");
const previewFoto  = document.getElementById("previewFoto");

fotoInput.addEventListener("change", () => {
  const file = fotoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotoBase64 = e.target.result;
    previewFoto.src = fotoBase64;
    previewFoto.classList.remove("hidden");
    labelFoto.textContent = "📷 Trocar";
    btnRemFoto.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

btnRemFoto.addEventListener("click", () => {
  fotoBase64 = null;
  fotoInput.value = "";
  previewFoto.classList.add("hidden");
  previewFoto.src = "";
  labelFoto.textContent = "📷 Adicionar";
  btnRemFoto.classList.add("hidden");
});

// =============================================
// FORMULÁRIO
// =============================================
const form         = document.getElementById("formCompra");
const itemInput    = document.getElementById("item");
const categoriaInput = document.getElementById("categoria");
const valorJPYInput  = document.getElementById("valorJPY");
const btnSubmit    = document.getElementById("btnSubmit");

form.addEventListener("submit", e => {
  e.preventDefault();
  const item      = itemInput.value.trim();
  const categoria = categoriaInput.value;
  const jpy       = parseFloat(valorJPYInput.value);
  if (!item || isNaN(jpy) || jpy <= 0) return;

  const conversoes = converterJPY(jpy);
  const viagem = viagemAtual();
  const agora = new Date().toISOString();

  if (editandoId !== null) {
    const idx = viagem.compras.findIndex(c => c.id === editandoId);
    if (idx !== -1) {
      viagem.compras[idx] = { ...viagem.compras[idx], item, categoria, jpy, conversoes, foto: fotoBase64 ?? viagem.compras[idx].foto };
    }
    editandoId = null;
    btnSubmit.textContent = "＋ Adicionar";
    mostrarToast("Compra atualizada!", "sucesso");
  } else {
    viagem.compras.push({ id: gerarId(), item, categoria, jpy, conversoes, foto: fotoBase64, data: agora });
    mostrarToast("Compra adicionada!", "sucesso");
  }

  salvarViagens();
  atualizarTabela(document.getElementById("busca").value);
  renderizarHistorico();
  resetarForm();
});

function resetarForm() {
  form.reset();
  categoriaInput.value = "Eletrônicos";
  fotoBase64 = null;
  fotoInput.value = "";
  previewFoto.classList.add("hidden");
  previewFoto.src = "";
  labelFoto.textContent = "📷 Adicionar";
  btnRemFoto.classList.add("hidden");
  btnSubmit.textContent = "＋ Adicionar";
  editandoId = null;
}

// =============================================
// EDITAR / REMOVER
// =============================================
function editarCompra(id) {
  const viagem = viagemAtual();
  const compra = viagem.compras.find(c => c.id === id);
  if (!compra) return;
  itemInput.value      = compra.item;
  categoriaInput.value = compra.categoria || "Outros";
  valorJPYInput.value  = compra.jpy;
  fotoBase64 = compra.foto || null;
  if (fotoBase64) {
    previewFoto.src = fotoBase64;
    previewFoto.classList.remove("hidden");
    labelFoto.textContent = "📷 Trocar";
    btnRemFoto.classList.remove("hidden");
  }
  editandoId = id;
  btnSubmit.textContent = "✓ Salvar";
  itemInput.focus();
  mostrarToast("Editando item — altere e salve.", "info");
}

function removerCompra(id) {
  const linha = document.querySelector(`#tabelaCompras tbody tr[data-id="${id}"]`);
  if (linha) {
    linha.classList.add("removendo");
    setTimeout(() => _removerCompra(id), 300);
  } else {
    _removerCompra(id);
  }
}

function _removerCompra(id) {
  const viagem = viagemAtual();
  viagem.compras = viagem.compras.filter(c => c.id !== id);
  if (editandoId === id) resetarForm();
  alertaDisparado = false;
  salvarViagens();
  atualizarTabela(document.getElementById("busca").value);
  renderizarHistorico();
  renderizarSidebar();
  mostrarToast("Compra removida.", "info");
}

// =============================================
// TABELA
// =============================================
function atualizarTabela(filtro = "") {
  const viagem = viagemAtual();
  if (!viagem) return;
  const tbody = document.querySelector("#tabelaCompras tbody");
  tbody.innerHTML = "";

  // Atualiza cabeçalho dinâmico de moedas
  const headerRow = document.getElementById("headerRow");
  // Remove colunas de moeda antigas (mantém Item, Cat, Data, JPY, Ações)
  const thsFixos = ["Item", "Cat.", "Data", "JPY (¥)", "Ações"];
  headerRow.innerHTML = thsFixos.slice(0, 4).map(t => `<th>${t}</th>`).join("")
    + moedasAtivas.map(c => `<th>${c}</th>`).join("")
    + `<th>Ações</th>`;

  const filtradas = viagem.compras.filter(c =>
    c.item.toLowerCase().includes(filtro.toLowerCase()) ||
    (c.categoria || "").toLowerCase().includes(filtro.toLowerCase())
  );

  const emptyMsg = document.getElementById("emptyMsg");
  emptyMsg.style.display = filtradas.length === 0 ? "block" : "none";

  filtradas.forEach(compra => {
    const linha = document.createElement("tr");
    linha.setAttribute("data-id", compra.id);

    const dataStr = compra.data ? new Date(compra.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
    const fotoCell = compra.foto
      ? `<td class="td-foto"><img src="${compra.foto}" alt="${escapeHTML(compra.item)}" onclick="abrirFoto('${compra.id}')"></td>`
      : "";

    const colunasMoeda = moedasAtivas.map(code => {
      const val = compra.conversoes?.[code] ?? 0;
      return `<td class="td-moeda">${simbolo(code)}${val.toFixed(2)}</td>`;
    }).join("");

    linha.innerHTML = `
      <td>
        ${compra.foto ? `<img src="${compra.foto}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px;cursor:pointer" onclick="abrirFoto('${compra.id}')" alt="">` : ""}
        ${escapeHTML(compra.item)}
      </td>
      <td><span class="cat-tag">${escapeHTML(compra.categoria || "Outros")}</span></td>
      <td class="td-data">${dataStr}</td>
      <td class="td-jpy">¥${compra.jpy.toLocaleString("ja-JP")}</td>
      ${colunasMoeda}
      <td>
        <button class="btn-acao btn-edit"     onclick="editarCompra('${compra.id}')"  title="Editar">✏️</button>
        <button class="btn-acao btn-wish-add" onclick="moverParaDesejo('${compra.id}')" title="Mover para desejos">⭐</button>
        <button class="btn-acao btn-del"      onclick="removerCompra('${compra.id}')" title="Remover">🗑️</button>
      </td>
    `;
    tbody.appendChild(linha);
  });

  atualizarProgresso();
  atualizarResumoCategorias();
}

function atualizarProgresso() {
  const viagem = viagemAtual();
  if (!viagem) return;
  const taxaUSD = taxas.USD || TAXAS_PADRAO.USD;
  const totalUSD = viagem.compras.reduce((acc, c) => acc + (c.conversoes?.USD ?? c.jpy * taxaUSD), 0);
  const percent  = Math.min((totalUSD / limiteUSD) * 100, 100);

  document.getElementById("totalLabel").textContent  = `Total: $${totalUSD.toFixed(2)}`;
  document.getElementById("limiteLabel").textContent = `Limite: $${limiteUSD.toFixed(2)}`;
  document.getElementById("percentLabel").textContent = `${percent.toFixed(1)}%`;

  const totalDiv = document.getElementById("total");
  totalDiv.textContent = `$${totalUSD.toFixed(2)} / $${limiteUSD.toFixed(2)} — ${percent.toFixed(1)}% do limite`;

  totalDiv.classList.remove("atualizando");
  void totalDiv.offsetWidth;
  totalDiv.classList.add("atualizando");
  setTimeout(() => totalDiv.classList.remove("atualizando"), 500);

  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = percent + "%";

  if (totalUSD >= limiteUSD) {
    progressBar.classList.add("alerta");
    totalDiv.classList.add("alerta");
    if (!alertaDisparado) {
      alertaDisparado = true;
      mostrarToast(`⚠️ Limite de $${limiteUSD.toFixed(0)} atingido!`, "alerta");
    }
  } else {
    progressBar.classList.remove("alerta");
    totalDiv.classList.remove("alerta");
    alertaDisparado = false;
  }
}

function atualizarResumoCategorias() {
  const viagem = viagemAtual();
  if (!viagem) return;
  const el = document.getElementById("resumoCategorias");
  el.innerHTML = "";
  if (viagem.compras.length === 0) return;
  const taxaUSD = taxas.USD || TAXAS_PADRAO.USD;
  const totais = {};
  viagem.compras.forEach(c => {
    const cat = c.categoria || "Outros";
    totais[cat] = (totais[cat] || 0) + (c.conversoes?.USD ?? c.jpy * taxaUSD);
  });
  Object.entries(totais).sort((a,b) => b[1]-a[1]).forEach(([cat, val]) => {
    const badge = document.createElement("span");
    badge.className = "cat-badge";
    badge.textContent = `${cat}: $${val.toFixed(2)}`;
    el.appendChild(badge);
  });
}

// =============================================
// HISTÓRICO POR DIA
// =============================================
function renderizarHistorico() {
  const viagem = viagemAtual();
  if (!viagem) return;
  const wrap    = document.getElementById("historicoConteudo");
  const emptyH  = document.getElementById("emptyHistorico");
  wrap.innerHTML = "";

  if (viagem.compras.length === 0) {
    emptyH.style.display = "block";
    return;
  }
  emptyH.style.display = "none";

  // Agrupa por dia
  const grupos = {};
  viagem.compras.forEach(c => {
    const dia = c.data ? c.data.slice(0,10) : "sem-data";
    if (!grupos[dia]) grupos[dia] = [];
    grupos[dia].push(c);
  });

  const taxaUSD = taxas.USD || TAXAS_PADRAO.USD;

  Object.keys(grupos).sort((a,b) => b.localeCompare(a)).forEach(dia => {
    const items = grupos[dia];
    const totalDiaUSD = items.reduce((acc,c) => acc + (c.conversoes?.USD ?? c.jpy * taxaUSD), 0);
    const diaLabel = dia === "sem-data" ? "Sem data" :
      new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

    const grupo = document.createElement("div");
    grupo.className = "dia-grupo";
    grupo.innerHTML = `
      <div class="dia-header">
        <span class="dia-data">📅 ${diaLabel}</span>
        <span class="dia-total">$${totalDiaUSD.toFixed(2)} USD · ${items.length} item(s)</span>
      </div>
      <div class="dia-tabela">
        <table>
          <tbody>
            ${items.map(c => `
              <tr>
                <td>${c.foto ? `<img src="${c.foto}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px">` : ""}${escapeHTML(c.item)}</td>
                <td><span class="cat-tag">${escapeHTML(c.categoria||"Outros")}</span></td>
                <td class="td-jpy">¥${c.jpy.toLocaleString("ja-JP")}</td>
                <td class="td-moeda">$${(c.conversoes?.USD ?? c.jpy*taxaUSD).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    wrap.appendChild(grupo);
  });
}

// =============================================
// WISHLIST (LISTA DE DESEJOS)
// =============================================
function renderizarWishlist() {
  const viagem = viagemAtual();
  if (!viagem) return;
  const lista = document.getElementById("listaDesejos");
  lista.innerHTML = "";

  // Form de adição de desejo
  const formDesejo = document.createElement("div");
  formDesejo.className = "wishlist-form";
  formDesejo.innerHTML = `
    <div class="form-group"><label for="wItem">Item desejado:</label><input type="text" id="wItem" placeholder="Ex: Tênis Nike"></div>
    <div class="form-group"><label for="wJPY">Preço estimado (¥):</label><input type="number" id="wJPY" placeholder="Ex: 8000" min="1"></div>
    <div class="form-group"><label for="wCat">Categoria:</label>
      <select id="wCat">
        <option>Eletrônicos</option><option>Roupas</option><option>Alimentação</option>
        <option>Cosméticos</option><option>Souvenirs</option><option>Outros</option>
      </select>
    </div>
    <button id="btnAddDesejo" class="btn-full">⭐ Adicionar à lista</button>
  `;
  lista.appendChild(formDesejo);
  document.getElementById("btnAddDesejo").addEventListener("click", adicionarDesejo);

  if (!viagem.desejos || viagem.desejos.length === 0) {
    const vazio = document.createElement("p");
    vazio.style.cssText = "text-align:center;padding:20px;color:var(--text2);font-size:13px;";
    vazio.textContent = "Nenhum desejo adicionado ainda.";
    lista.appendChild(vazio);
    return;
  }

  const taxaUSD = taxas.USD || TAXAS_PADRAO.USD;
  viagem.desejos.forEach(d => {
    const item = document.createElement("div");
    item.className = "desejo-item";
    const conversoes = converterJPY(d.jpy);
    item.innerHTML = `
      <div class="desejo-item-header">
        <div>
          <div class="desejo-item-nome">${escapeHTML(d.item)}</div>
          <div class="desejo-item-vals">¥${d.jpy.toLocaleString("ja-JP")} · $${conversoes.USD.toFixed(2)} · R$${conversoes.BRL.toFixed(2)}</div>
        </div>
        <span class="cat-tag">${escapeHTML(d.categoria||"Outros")}</span>
      </div>
      <div class="desejo-acoes">
        <button class="btn-comprar" onclick="confirmarDesejo('${d.id}')">✓ Comprei!</button>
        <button class="btn-acao btn-del" onclick="removerDesejo('${d.id}')">🗑️</button>
      </div>
    `;
    lista.appendChild(item);
  });
}

function adicionarDesejo() {
  const item = document.getElementById("wItem").value.trim();
  const jpy  = parseFloat(document.getElementById("wJPY").value);
  const cat  = document.getElementById("wCat").value;
  if (!item || isNaN(jpy) || jpy <= 0) { mostrarToast("Preencha item e preço.", "alerta"); return; }
  const viagem = viagemAtual();
  if (!viagem.desejos) viagem.desejos = [];
  viagem.desejos.push({ id: gerarId(), item, jpy, categoria: cat });
  salvarViagens();
  renderizarWishlist();
  mostrarToast("Adicionado à lista de desejos!", "sucesso");
}

function confirmarDesejo(id) {
  const viagem = viagemAtual();
  const desejo = viagem.desejos.find(d => d.id === id);
  if (!desejo) return;
  // Move para compras
  const conversoes = converterJPY(desejo.jpy);
  viagem.compras.push({ id: gerarId(), item: desejo.item, categoria: desejo.categoria, jpy: desejo.jpy, conversoes, foto: null, data: new Date().toISOString() });
  viagem.desejos = viagem.desejos.filter(d => d.id !== id);
  salvarViagens();
  atualizarTabela(document.getElementById("busca").value);
  renderizarHistorico();
  renderizarSidebar();
  renderizarWishlist();
  mostrarToast("Compra confirmada! Item movido para a lista.", "sucesso");
}

function removerDesejo(id) {
  const viagem = viagemAtual();
  viagem.desejos = viagem.desejos.filter(d => d.id !== id);
  salvarViagens();
  renderizarWishlist();
  mostrarToast("Desejo removido.", "info");
}

function moverParaDesejo(id) {
  const viagem = viagemAtual();
  const compra = viagem.compras.find(c => c.id === id);
  if (!compra) return;
  if (!viagem.desejos) viagem.desejos = [];
  viagem.desejos.push({ id: gerarId(), item: compra.item, jpy: compra.jpy, categoria: compra.categoria });
  viagem.compras = viagem.compras.filter(c => c.id !== id);
  if (editandoId === id) resetarForm();
  alertaDisparado = false;
  salvarViagens();
  atualizarTabela(document.getElementById("busca").value);
  renderizarWishlist();
  mostrarToast("Movido para desejos!", "sucesso");
}

// =============================================
// CALCULADORA
// =============================================
function atualizarCalculadora() {
  const val = parseFloat(document.getElementById("calcJPY").value);
  const wrap = document.getElementById("calcResultados");
  wrap.innerHTML = "";
  if (isNaN(val) || val <= 0) return;
  const conversoes = converterJPY(val);
  moedasAtivas.forEach(code => {
    const card = document.createElement("div");
    card.className = "calc-card";
    card.innerHTML = `<div class="calc-card-label">${code}</div><div class="calc-card-valor">${simbolo(code)}${conversoes[code].toFixed(2)}</div>`;
    wrap.appendChild(card);
  });
  // Adiciona moedas não ativas também (mais suaves)
  MOEDAS_DISPONIVEIS.filter(m => !moedasAtivas.includes(m.code)).forEach(m => {
    const card = document.createElement("div");
    card.className = "calc-card";
    card.style.opacity = "0.5";
    card.innerHTML = `<div class="calc-card-label">${m.code}</div><div class="calc-card-valor" style="font-size:16px">${m.simbolo}${conversoes[m.code].toFixed(2)}</div>`;
    wrap.appendChild(card);
  });
}

// =============================================
// FOTO — VER EXPANDIDA
// =============================================
function abrirFoto(id) {
  const viagem = viagemAtual();
  const compra = viagem.compras.find(c => c.id === id);
  if (!compra?.foto) return;
  const modal = document.createElement("div");
  modal.id = "fotoModal";
  modal.innerHTML = `<img src="${compra.foto}" alt="${escapeHTML(compra.item)}">`;
  modal.addEventListener("click", () => modal.remove());
  document.body.appendChild(modal);
}

// =============================================
// EXPORTAR CSV
// =============================================
document.getElementById("btnExportCSV").addEventListener("click", () => {
  const viagem = viagemAtual();
  if (viagem.compras.length === 0) { mostrarToast("Nenhuma compra para exportar.", "info"); return; }
  const cabecalho = ["Item","Categoria","Data","JPY", ...moedasAtivas];
  const taxaUSD = taxas.USD || TAXAS_PADRAO.USD;
  const linhas = viagem.compras.map(c => {
    const dataStr = c.data ? new Date(c.data).toLocaleDateString("pt-BR") : "";
    const moedsVals = moedasAtivas.map(code => (c.conversoes?.[code] ?? c.jpy * taxaParaMoeda(code)).toFixed(2));
    return [`"${c.item}"`, `"${c.categoria||""}"`, `"${dataStr}"`, c.jpy, ...moedsVals].join(",");
  });
  const csv  = [cabecalho.join(","), ...linhas].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: `compras-${viagem.nome}.csv` });
  a.click(); URL.revokeObjectURL(url);
  mostrarToast("CSV exportado!", "sucesso");
});

// =============================================
// EXPORTAR PDF
// =============================================
document.getElementById("btnExportPDF").addEventListener("click", () => {
  const viagem = viagemAtual();
  if (viagem.compras.length === 0) { mostrarToast("Nenhuma compra para exportar.", "info"); return; }
  const taxaUSD = taxas.USD || TAXAS_PADRAO.USD;
  const totalUSD = viagem.compras.reduce((acc,c) => acc + (c.conversoes?.USD ?? c.jpy*taxaUSD), 0);
  const totalBRL = viagem.compras.reduce((acc,c) => acc + (c.conversoes?.BRL ?? c.jpy*(taxas.BRL||TAXAS_PADRAO.BRL)), 0);
  const dataHoje = new Date().toLocaleDateString("pt-BR");

  const linhas = viagem.compras.map(c => {
    const dataStr = c.data ? new Date(c.data).toLocaleDateString("pt-BR") : "—";
    const moedsVals = moedasAtivas.map(code => `${simbolo(code)}${(c.conversoes?.[code]??c.jpy*taxaParaMoeda(code)).toFixed(2)}`).join(" &nbsp;|&nbsp; ");
    return `<tr>
      <td>${escapeHTML(c.item)}</td>
      <td>${escapeHTML(c.categoria||"")}</td>
      <td>${dataStr}</td>
      <td>¥${c.jpy.toLocaleString("ja-JP")}</td>
      <td>${moedsVals}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
  <meta charset="UTF-8"><title>Compras - ${escapeHTML(viagem.nome)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #222; }
    h1 { color: #c0392b; } h2 { color: #555; font-size:14px; font-weight:normal; }
    table { width:100%; border-collapse:collapse; margin-top:20px; font-size:13px; }
    th { background:#c0392b; color:#fff; padding:8px; text-align:left; }
    td { padding:7px 8px; border-bottom:1px solid #eee; }
    tr:nth-child(even) td { background:#fafafa; }
    .resumo { margin-top:20px; padding:12px; background:#fff3f3; border-radius:6px; }
    .resumo p { margin:4px 0; font-size:13px; }
  </style></head><body>
  <h1>🇯🇵 ${escapeHTML(viagem.nome)}</h1>
  <h2>${escapeHTML(viagem.destino||"")} · Emitido em ${dataHoje}</h2>
  <table>
    <thead><tr><th>Item</th><th>Categoria</th><th>Data</th><th>JPY</th><th>Valores</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="resumo">
    <p><strong>Total de itens:</strong> ${viagem.compras.length}</p>
    <p><strong>Total em USD:</strong> $${totalUSD.toFixed(2)} / Limite: $${limiteUSD.toFixed(2)}</p>
    <p><strong>Total em BRL:</strong> R$${totalBRL.toFixed(2)}</p>
  </div>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 800); }
  else { mostrarToast("Permita pop-ups para gerar o PDF.", "alerta"); }
});

// =============================================
// BACKUP & RESTAURAÇÃO
// =============================================
document.getElementById("btnBackup").addEventListener("click", () => {
  const dados = { viagens, moedasAtivas, limiteUSD, tema, exportadoEm: new Date().toISOString() };
  const blob  = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url   = URL.createObjectURL(blob);
  const a     = Object.assign(document.createElement("a"), { href: url, download: "backup-compras-japao.json" });
  a.click(); URL.revokeObjectURL(url);
  mostrarToast("Backup exportado!", "sucesso");
});

document.getElementById("btnRestaurar").addEventListener("click", () => {
  document.getElementById("inputRestaurar").click();
});

document.getElementById("inputRestaurar").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const dados = JSON.parse(ev.target.result);
      if (!dados.viagens || !Array.isArray(dados.viagens)) throw new Error("Formato inválido");
      if (!confirm(`Restaurar backup com ${dados.viagens.length} viagem(ns)? Os dados atuais serão substituídos.`)) return;
      viagens       = dados.viagens;
      moedasAtivas  = dados.moedasAtivas || ["USD","BRL"];
      limiteUSD     = dados.limiteUSD || 1000;
      viagemAtualId = viagens[0]?.id || null;
      localStorage.setItem("viagens", JSON.stringify(viagens));
      localStorage.setItem("moedasAtivas", JSON.stringify(moedasAtivas));
      localStorage.setItem("limiteUSD", limiteUSD);
      localStorage.setItem("viagemAtualId", viagemAtualId);
      document.getElementById("limiteUSD").value = limiteUSD;
      renderizarCheckboxMoedas();
      renderizarSidebar();
      atualizarHeaderViagem();
      atualizarTabela();
      renderizarHistorico();
      renderizarWishlist();
      mostrarToast("Backup restaurado com sucesso!", "sucesso");
    } catch (err) {
      mostrarToast("Arquivo inválido ou corrompido.", "alerta");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// =============================================
// LIMPAR TUDO
// =============================================
document.getElementById("btnLimpar").addEventListener("click", () => {
  const viagem = viagemAtual();
  if (viagem.compras.length === 0) return;
  if (!confirm("Apagar todas as compras desta viagem?")) return;
  viagem.compras = [];
  alertaDisparado = false;
  resetarForm();
  salvarViagens();
  renderizarSidebar();
  atualizarTabela();
  renderizarHistorico();
  mostrarToast("Lista limpa.", "info");
});

// =============================================
// BIND DE EVENTOS GERAIS
// =============================================
function bindEventos() {
  // Sidebar de viagens
  document.getElementById("btnSidebar").addEventListener("click", abrirSidebar);
  document.getElementById("btnFecharSidebar").addEventListener("click", fecharSidebar);
  document.getElementById("sidebarOverlay").addEventListener("click", fecharSidebar);

  // Nova viagem
  document.getElementById("btnNovaViagem").addEventListener("click", () => {
    fecharSidebar();
    document.getElementById("modalViagem").classList.remove("hidden");
  });
  document.getElementById("btnFecharModalViagem").addEventListener("click", () => document.getElementById("modalViagem").classList.add("hidden"));
  document.getElementById("btnCriarViagem").addEventListener("click", () => {
    const nome   = document.getElementById("nomeViagemInput").value.trim();
    const destino= document.getElementById("destinoInput").value.trim();
    if (!nome) { mostrarToast("Digite um nome para a viagem.", "alerta"); return; }
    const nova = criarViagemObj(nome, destino);
    viagens.push(nova);
    salvarViagens();
    document.getElementById("modalViagem").classList.add("hidden");
    document.getElementById("nomeViagemInput").value = "";
    document.getElementById("destinoInput").value = "";
    trocarViagem(nova.id);
    mostrarToast("Viagem criada!", "sucesso");
  });

  // Wishlist
  document.getElementById("btnWishlist").addEventListener("click", () => {
    renderizarWishlist();
    abrirWishlist();
  });
  document.getElementById("btnFecharWishlist").addEventListener("click", fecharWishlist);
  document.getElementById("wishlistOverlay").addEventListener("click", fecharWishlist);

  // Moedas
  document.getElementById("btnMoedas").addEventListener("click", () => document.getElementById("modalMoedas").classList.remove("hidden"));
  document.getElementById("btnFecharMoedas").addEventListener("click", () => document.getElementById("modalMoedas").classList.add("hidden"));
  document.getElementById("btnSalvarMoedas").addEventListener("click", () => {
    const checks = document.querySelectorAll("#checkboxMoedas input:checked");
    if (checks.length === 0) { mostrarToast("Selecione ao menos uma moeda.", "alerta"); return; }
    moedasAtivas = Array.from(checks).map(c => c.value);
    localStorage.setItem("moedasAtivas", JSON.stringify(moedasAtivas));
    document.getElementById("modalMoedas").classList.add("hidden");
    atualizarTabela(document.getElementById("busca").value);
    atualizarCalculadora();
    mostrarToast("Moedas salvas!", "sucesso");
  });

  // Abas
  document.querySelectorAll(".aba").forEach(btn => {
    btn.addEventListener("click", () => abaAtiva(btn.dataset.aba));
  });

  // Busca
  document.getElementById("busca").addEventListener("input", e => atualizarTabela(e.target.value));

  // Limite
  document.getElementById("limiteUSD").addEventListener("change", () => {
    const val = parseFloat(document.getElementById("limiteUSD").value);
    if (!isNaN(val) && val > 0) {
      limiteUSD = val;
      localStorage.setItem("limiteUSD", limiteUSD);
      alertaDisparado = false;
      atualizarProgresso();
    }
  });

  // Atualizar taxas
  btnAtualizar.addEventListener("click", buscarTaxas);

  // Calculadora
  document.getElementById("calcJPY").addEventListener("input", atualizarCalculadora);

  // Temas
  document.querySelectorAll("#themeSelector button").forEach(btn => {
    btn.addEventListener("click", () => aplicarTema(btn.dataset.theme));
  });
}

// =============================================
// ABAS
// =============================================
function abaAtiva(aba) {
  document.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === aba));
  document.getElementById("abaCompras").classList.toggle("hidden", aba !== "compras");
  document.getElementById("abaCalculadora").classList.toggle("hidden", aba !== "calculadora");
  document.getElementById("abaHistorico").classList.toggle("hidden", aba !== "historico");
  if (aba === "historico") renderizarHistorico();
  if (aba === "calculadora") atualizarCalculadora();
}

// =============================================
// SIDEBAR / WISHLIST HELPERS
// =============================================
function abrirSidebar() {
  document.getElementById("sidebar").classList.add("aberta");
  document.getElementById("sidebarOverlay").classList.add("visivel");
}
function fecharSidebar() {
  document.getElementById("sidebar").classList.remove("aberta");
  document.getElementById("sidebarOverlay").classList.remove("visivel");
}
function abrirWishlist() {
  document.getElementById("wishlistPanel").classList.add("aberta");
  document.getElementById("wishlistOverlay").classList.add("visivel");
}
function fecharWishlist() {
  document.getElementById("wishlistPanel").classList.remove("aberta");
  document.getElementById("wishlistOverlay").classList.remove("visivel");
}

// =============================================
// TEMA
// =============================================
function aplicarTema(t) {
  tema = t;
  document.body.className = `theme-${t}`;
  localStorage.setItem("tema", t);
  document.querySelectorAll("#themeSelector button").forEach(b => b.classList.toggle("ativo", b.dataset.theme === t));
}

// =============================================
// TOAST
// =============================================
function mostrarToast(msg, tipo = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${tipo} visivel`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visivel"), 3200);
}

// =============================================
// UTILS
// =============================================
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function escapeHTML(str = "") {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}