// ===== Configuração inicial =====
const form = document.getElementById("formCompra");
const itemInput = document.getElementById("item");
const valorJPYInput = document.getElementById("valorJPY");
const buscaInput = document.getElementById("busca");
const tabela = document.querySelector("#tabelaCompras tbody");
const totalDiv = document.getElementById("total");
const themeSelector = document.getElementById("themeSelector");

let compras = JSON.parse(localStorage.getItem("compras")) || [];

// Taxas de câmbio fixas (pode ser atualizado via API futuramente)
const TAXA_USD = 0.0065; // exemplo: 1 JPY = 0.0065 USD
const TAXA_BRL = 0.034;  // exemplo: 1 JPY = 0.034 BRL

// ===== Funções utilitárias =====
function converterMoeda(jpy) {
  return {
    usd: jpy * TAXA_USD,
    brl: jpy * TAXA_BRL,
    taxaUSD: TAXA_USD,
    taxaBRL: TAXA_BRL
  };
}

function calcularTotalUSD(lista) {
  return lista.reduce((acc, compra) => acc + compra.usd, 0);
}
// ===== Adicionar compra =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const item = itemInput.value.trim();
  const jpy = parseFloat(valorJPYInput.value);

  if (!item || isNaN(jpy)) return;

  const valores = converterMoeda(jpy);
  compras.push({ item, jpy, ...valores });

  localStorage.setItem("compras", JSON.stringify(compras));
  atualizarTabela(buscaInput.value);

  form.reset();
});

// ===== Editar compra =====
function editarCompra(index) {
  const compra = compras[index];
  itemInput.value = compra.item;
  valorJPYInput.value = compra.jpy;

  // Remove temporariamente para re-adicionar atualizado
  compras.splice(index, 1);
  localStorage.setItem("compras", JSON.stringify(compras));
  atualizarTabela(buscaInput.value);
}

// ===== Remover compra com animação =====
function removerCompra(index) {
  const linha = tabela.querySelectorAll("tr")[index];
  linha.classList.add("removendo");
  setTimeout(() => {
    compras.splice(index, 1);
    localStorage.setItem("compras", JSON.stringify(compras));
    atualizarTabela(buscaInput.value);
  }, 300); // tempo da animação fadeOut
}
// ===== Atualizar tabela =====
function atualizarTabela(filtro = "") {
  tabela.innerHTML = "";
  compras.forEach((compra, index) => {
    if (compra.item.toLowerCase().includes(filtro.toLowerCase())) {
      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${compra.item}</td>
        <td>${compra.jpy} ¥</td>
        <td>$${compra.usd.toFixed(2)} <small>(Taxa: ${compra.taxaUSD.toFixed(4)} USD)</small></td>
        <td>R$${compra.brl.toFixed(2)} <small>(Taxa: ${compra.taxaBRL.toFixed(4)} BRL)</small></td>
        <td>
          <button onclick="editarCompra(${index})">✏️</button>
          <button onclick="removerCompra(${index})">🗑️</button>
        </td>
      `;
      tabela.appendChild(linha);
    }
  });

  const totalUSD = calcularTotalUSD(compras);
  totalDiv.textContent = `Total em USD: $${totalUSD.toFixed(2)} / Limite: $1000`;

  // animação ao atualizar total
  totalDiv.classList.add("atualizando");
  setTimeout(() => totalDiv.classList.remove("atualizando"), 600);

  const progressBar = document.getElementById("progressBar");
  let percent = Math.min((totalUSD / 1000) * 100, 100);
  progressBar.style.width = percent + "%";
  progressBar.textContent = `${percent.toFixed(1)}%`;

  if (totalUSD >= 1000) {
    progressBar.classList.add("alerta");
    totalDiv.classList.add("alerta");
    alert("⚠️ Atenção! Você ultrapassou o limite de $1000 da alfândega.");
  } else {
    progressBar.classList.remove("alerta");
    totalDiv.classList.remove("alerta");
  }
}

// ===== Filtro de busca =====
buscaInput.addEventListener("input", () => {
  atualizarTabela(buscaInput.value);
});
// ===== Troca de temas =====
themeSelector.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.getAttribute("data-theme");
    document.body.className = `theme-${theme}`;
  });
});

// ===== Inicialização =====
atualizarTabela();
