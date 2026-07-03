# 🇯🇵 Controle de Compras — Japão 2028

App PWA para controlar gastos de viagem ao Japão, com conversão de moedas em tempo real e controle do limite alfandegário.

🔗 **[Acesse o app ao vivo](https://thepaulojorge.github.io/controledecompras/)**

---

## ✨ Funcionalidades

- 🧳 **Múltiplas viagens** — crie e alterne entre diferentes viagens pelo menu lateral
- 🛍 **Registro de compras** — adicione itens com categoria, valor em JPY e foto opcional
- ⭐ **Lista de desejos** — salve itens que pretende comprar e confirme depois
- 📅 **Histórico por dia** — visualize os gastos agrupados por data
- 🧮 **Calculadora rápida** — converta JPY para outras moedas sem adicionar uma compra
- 🌍 **Moedas configuráveis** — escolha quais moedas exibir (USD, BRL, EUR, GBP, ARS, KRW, CNY, CAD)
- 📊 **Barra de progresso** — acompanhe o limite alfandegário em tempo real
- 💱 **Taxas ao vivo** — busca automaticamente as taxas de câmbio atualizadas
- 📄 **Exportar PDF** — gera relatório completo das compras
- ⬇ **Exportar CSV** — exporta a lista para planilha
- 💾 **Backup & Restauração** — salva e importa todos os dados em JSON
- 🎨 **4 temas** — Padrão, Dark, Viagem e Minimalista
- 📱 **PWA** — instalável no celular, funciona offline

---

## 🖥 Tecnologias

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

- HTML5, CSS3 e JavaScript puro (sem frameworks)
- PWA com Service Worker e cache offline
- API [open.er-api.com](https://open.er-api.com) para taxas de câmbio
- localStorage para persistência de dados
- Google Fonts — Noto Sans JP + Space Mono

---

## 📁 Estrutura do projeto

```
controledecompras/
├── index.html
├── style.css
├── script.js
├── manifest.json
├── service-worker.js
└── icon/
    ├── 192x192.png
    ├── 512x512.png
    └── 1024x1024.png
```

---

## 🚀 Como usar localmente

```bash
# Clone o repositório
git clone https://github.com/thepaulojorge/controledecompras.git

# Abra o index.html no navegador
# (recomendado usar Live Server no VS Code)
```

---

## 📸 Preview

> App rodando no navegador com tema padrão japonês 🌸

---

## 👨‍💻 Autor

Feito por **Paulo Jorge** — desenvolvedor front-end em formação.

[![GitHub](https://img.shields.io/badge/GitHub-thepaulojorge-181717?style=flat&logo=github)](https://github.com/thepaulojorge)
[![Portfólio](https://img.shields.io/badge/Portfólio-thepaulojorge.github.io-c0392b?style=flat&logo=googlechrome&logoColor=white)](https://thepaulojorge.github.io/portfoliopaulojorge/)
[![YouTube](https://img.shields.io/badge/YouTube-The%20Paulo%20Jorge-FF0000?style=flat&logo=youtube)](https://youtube.com/@thepaulojorge)
