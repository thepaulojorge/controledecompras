// ===== Configuração inicial =====
const form          = document.getElementById("formCompra");
const itemInput     = document.getElementById("item");
const categoriaInput= document.getElementById("categoria");
const valorJPYInput = document.getElementById("valorJPY");
const buscaInput    = document.getElementById("busca");
const tabela        = document.querySelector("#tabelaCompras tbody");
const totalDiv      = document.getElementById("total");
const totalLabel    = document.getElementById("totalLabel");
const limiteLabel   = document.getElementById("limiteLabel");
const percentLabel  = document.getElementById("percentLabel");
const themeSelector = document.getElementById("themeSelector");
const limiteInput   = document.getElementById("limiteUSD");
const taxaInfoEl    = document.getElementById("taxaInfo");
const emptyMsg      = document.getElementById("emptyMsg");
const btnSubmit     = document.getElementById("btnSubmit");
const btnExportCSV  = document.getElementById("btnExportCSV");
const btnLimpar     = document.getElementById("btnLimpar");
const btnAtualizar  = document.getElementById("btnAtualizarTaxa");

// ===== Estado =====
let compras = JSON.parse(localStorage.getItem("compras")) || [];
let taxaUSD = parseFloat(localStorage.getItem("taxaUSD")) || 0.0065;
let taxaBRL = parseFloat(localStorage.getItem("taxaBRL")) || 0.034;
let limiteUSD = parseFloat(localStorage.getItem("limiteUSD")) || 1000;
let editandoId = null;       // ID da compra em edição (null = nova)
let alertaDisparado = false; // evita alert repetitivo

// ===== Inicialização =====
limiteInput.value = limiteUSD;
aplicarTema(localStorage.getItem("tema") || "default");
atualizarTabela();
buscarTaxas();

// ===== Taxas de câmbio via API =====
// Usa open.er-api.com (CORS aberto, gratuito, sem chave)
// Fallback: exchangerate.host
async function buscarTaxas() {
  taxaInfoEl.textContent = "Buscando taxas...";
  btnAtualizar.disabled = true;

  const apis = [
    {
      url: "https://open.er-api.com/v6/latest/JPY",
      parse: (data) => ({ usd: data.rates.USD, brl: data.rates.BRL })
    },
    {
      url: "https://api.exchangerate-api.com/v4/latest/JPY",
      parse: (data) => ({ usd: data.rates.USD, brl: data.rates.BRL })
    }
  ];

  for (const api of apis) {
    try {
      const res = await fetch(api.url);
      if (!res.ok) continue;
      const data = await res.json();
      const rates = api.parse(data);
      if (!rates.usd || !rates.brl) continue;

      taxaUSD = rates.usd;
      taxaBRL = rates.brl;
      localStorage.setItem("taxaUSD", taxaUSD);
      localStorage.setItem("taxaBRL", taxaBRL);
      taxaInfoEl.textContent = `¥1 = $${taxaUSD.toFixed(5)} | R$${taxaBRL.toFixed(4)} (ao vivo)`;
      mostrarToast("Taxas atualizadas!", "sucesso");
      btnAtualizar.disabled = false;
      return; // sucesso, para aqui
    } catch (e) {
      // tenta a próxima API
    }
  }

  // Todas as APIs falharam — usa valores salvos
  taxaInfoEl.textContent = `¥1 = $${taxaUSD.toFixed(5)} | R$${taxaBRL.toFixed(4)} (offline)`;
  mostrarToast("Sem conexão — usando taxas salvas.", "info");
  btnAtualizar.disabled = false;
}

btnAtualizar.addEventListener("click", buscarTaxas);

// ===== Limite configurável =====
limiteInput.addEventListener("change", () => {
  const val = parseFloat(limiteInput.value);
  if (!isNaN(val) && val > 0) {
    limiteUSD = val;
    localStorage.setItem("limiteUSD", limiteUSD);
    alertaDisparado = false; // reseta alerta ao mudar limite
    atualizarTabela();
  }
});

// ===== Gerar ID único =====
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ===== Converter moeda =====
function converterMoeda(jpy) {
  return {
    usd: parseFloat((jpy * taxaUSD).toFixed(2)),
    brl: parseFloat((jpy * taxaBRL).toFixed(2)),
    taxaUSD,
    taxaBRL
  };
}

// ===== Total em USD =====
function calcularTotalUSD() {
  return compras.reduce((acc, c) => acc + c.usd, 0);
}

// ===== Salvar no localStorage =====
function salvar() {
  localStorage.setItem("compras", JSON.stringify(compras));
}

// ===== Adicionar / Editar compra =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const item      = itemInput.value.trim();
  const categoria = categoriaInput.value;
  const jpy       = parseFloat(valorJPYInput.value);

  if (!item || isNaN(jpy) || jpy <= 0) return;

  const valores = converterMoeda(jpy);

  if (editandoId !== null) {
    // Modo edição: atualiza o item existente
    const idx = compras.findIndex(c => c.id === editandoId);
    if (idx !== -1) {
      compras[idx] = { ...compras[idx], item, categoria, jpy, ...valores };
    }
    editandoId = null;
    btnSubmit.textContent = "＋ Adicionar";
    mostrarToast("Compra atualizada!", "sucesso");
  } else {
    compras.push({ id: gerarId(), item, categoria, jpy, ...valores });
    mostrarToast("Compra adicionada!", "sucesso");
  }

  salvar();
  atualizarTabela(buscaInput.value);
  form.reset();
  categoriaInput.value = "Eletrônicos";
});

// ===== Editar compra =====
function editarCompra(id) {
  const compra = compras.find(c => c.id === id);
  if (!compra) return;

  itemInput.value      = compra.item;
  categoriaInput.value = compra.categoria || "Outros";
  valorJPYInput.value  = compra.jpy;

  editandoId = id;
  btnSubmit.textContent = "✓ Salvar edição";
  itemInput.focus();
  mostrarToast("Editando item. Altere os campos e salve.", "info");
}

// ===== Remover compra com animação =====
function removerCompra(id) {
  const linha = tabela.querySelector(`tr[data-id="${id}"]`);
  if (!linha) return;

  linha.classList.add("removendo");

  setTimeout(() => {
    compras = compras.filter(c => c.id !== id);

    // Se estava editando este item, cancela edição
    if (editandoId === id) {
      editandoId = null;
      btnSubmit.textContent = "＋ Adicionar";
      form.reset();
      categoriaInput.value = "Eletrônicos";
    }

    salvar();
    alertaDisparado = false; // permite re-alertar se necessário
    atualizarTabela(buscaInput.value);
    mostrarToast("Compra removida.", "info");
  }, 300);
}

// ===== Atualizar tabela =====
function atualizarTabela(filtro = "") {
  tabela.innerHTML = "";

  const filtradas = compras.filter(c =>
    c.item.toLowerCase().includes(filtro.toLowerCase()) ||
    (c.categoria || "").toLowerCase().includes(filtro.toLowerCase())
  );

  if (filtradas.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
  }

  filtradas.forEach((compra) => {
    const linha = document.createElement("tr");
    linha.setAttribute("data-id", compra.id); // usa ID único
    linha.innerHTML = `
      <td>${escapeHTML(compra.item)}</td>
      <td><span class="cat-tag">${escapeHTML(compra.categoria || "Outros")}</span></td>
      <td class="td-jpy">¥${compra.jpy.toLocaleString("ja-JP")}</td>
      <td class="td-usd">$${compra.usd.toFixed(2)}</td>
      <td class="td-brl">R$${compra.brl.toFixed(2)}</td>
      <td>
        <button class="btn-acao btn-edit" onclick="editarCompra('${compra.id}')" title="Editar">✏️</button>
        <button class="btn-acao btn-del" onclick="removerCompra('${compra.id}')" title="Remover">🗑️</button>
      </td>
    `;
    tabela.appendChild(linha);
  });

  // Totais
  const totalUSD = calcularTotalUSD();
  const percent  = Math.min((totalUSD / limiteUSD) * 100, 100);

  totalLabel.textContent  = `Total: $${totalUSD.toFixed(2)}`;
  limiteLabel.textContent = `Limite: $${limiteUSD.toFixed(2)}`;
  percentLabel.textContent = `${percent.toFixed(1)}%`;
  totalDiv.textContent    = `$${totalUSD.toFixed(2)} / $${limiteUSD.toFixed(2)} — ${percent.toFixed(1)}% do limite`;

  const progressBar = document.getElementById("progressBar");
  progressBar.style.width = percent + "%";

  // Animação no total
  totalDiv.classList.remove("atualizando");
  void totalDiv.offsetWidth;
  totalDiv.classList.add("atualizando");
  setTimeout(() => totalDiv.classList.remove("atualizando"), 500);

  // Alerta de limite — só dispara uma vez até que o valor caia abaixo
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

  // Resumo por categoria
  atualizarResumoCategorias();
}

// ===== Resumo de categorias =====
function atualizarResumoCategorias() {
  const el = document.getElementById("resumoCategorias");
  el.innerHTML = "";
  if (compras.length === 0) return;

  const totais = {};
  compras.forEach(c => {
    const cat = c.categoria || "Outros";
    totais[cat] = (totais[cat] || 0) + c.usd;
  });

  Object.entries(totais).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
    const badge = document.createElement("span");
    badge.className = "cat-badge";
    badge.textContent = `${cat}: $${val.toFixed(2)}`;
    el.appendChild(badge);
  });
}

// ===== Filtro de busca =====
buscaInput.addEventListener("input", () => {
  atualizarTabela(buscaInput.value);
});

// ===== Troca de temas =====
themeSelector.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    aplicarTema(btn.getAttribute("data-theme"));
  });
});

function aplicarTema(theme) {
  document.body.className = `theme-${theme}`;
  localStorage.setItem("tema", theme);
  themeSelector.querySelectorAll("button").forEach(b => {
    b.classList.toggle("ativo", b.getAttribute("data-theme") === theme);
  });
}

// ===== Exportar CSV =====
btnExportCSV.addEventListener("click", () => {
  if (compras.length === 0) {
    mostrarToast("Nenhuma compra para exportar.", "info");
    return;
  }
  const cabecalho = ["Item", "Categoria", "JPY", "USD", "BRL"];
  const linhas = compras.map(c =>
    [
      `"${c.item}"`,
      `"${c.categoria || 'Outros'}"`,
      c.jpy,
      c.usd.toFixed(2),
      c.brl.toFixed(2)
    ].join(",")
  );
  const csv = [cabecalho.join(","), ...linhas].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "compras-japao-2028.csv";
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast("CSV exportado!", "sucesso");
});

// ===== Limpar tudo =====
btnLimpar.addEventListener("click", () => {
  if (compras.length === 0) return;
  if (!confirm("Tem certeza que deseja apagar todas as compras?")) return;
  compras = [];
  salvar();
  alertaDisparado = false;
  editandoId = null;
  btnSubmit.textContent = "＋ Adicionar";
  form.reset();
  categoriaInput.value = "Eletrônicos";
  atualizarTabela();
  mostrarToast("Lista limpa.", "info");
});

// ===== Toast de notificação =====
let toastTimer = null;
function mostrarToast(msg, tipo = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = `toast ${tipo} visivel`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visivel");
  }, 3000);
}

// ===== Sanitizar HTML =====
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
