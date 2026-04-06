import { supabase } from "./supabase.js";

const CHAVE_CARRINHO = "biblioteca_central_carrinho_v3";
const CHAVE_FAVORITOS = "biblioteca_central_favoritos_v2";
const WHATSAPP_NUMERO = "5581999999999";

let categoriaSelecionada = "todas";
let livrosCache = [];

function obterCarrinho() {
  return JSON.parse(localStorage.getItem(CHAVE_CARRINHO)) || [];
}

function salvarCarrinho(carrinho) {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
}

function obterFavoritos() {
  return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || [];
}

function salvarFavoritos(favoritos) {
  localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calcularPrecoFinal(preco, desconto) {
  const valor = Number(preco || 0);
  const percentual = Number(desconto || 0);
  return valor - (valor * percentual / 100);
}

async function obterLivros() {
  const { data, error } = await supabase
    .from("livros")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Erro ao buscar livros:", error);
    return [];
  }

  return data || [];
}

function livroEhFavorito(id) {
  return obterFavoritos().includes(id);
}

window.alternarFavorito = function (id) {
  const favoritos = obterFavoritos();
  const indice = favoritos.indexOf(id);

  if (indice >= 0) {
    favoritos.splice(indice, 1);
  } else {
    favoritos.push(id);
  }

  salvarFavoritos(favoritos);
  renderizarLivros();
  renderizarFavoritos();
};

function criarCardLivro(livro) {
  const favorito = livroEhFavorito(livro.id);

  let precoHtml = `<div class="preco">Grátis</div>`;
  let botoes = `
    <a class="btn btn-secundario" href="detalhes.html?id=${livro.id}">Ver detalhes</a>
    <button class="btn btn-favorito ${favorito ? "ativo" : ""}" onclick="alternarFavorito(${livro.id})">
      ${favorito ? "Favoritado" : "Favoritar"}
    </button>
    <a class="btn btn-primario" href="${livro.arquivo || "#"}" target="_blank">Ler / Baixar</a>
  `;

  if (livro.tipo === "pago") {
    const precoFinal = calcularPrecoFinal(livro.preco, livro.desconto);

    precoHtml = `
      ${Number(livro.desconto || 0) > 0 ? `<div class="preco-antigo">${formatarPreco(livro.preco)}</div>` : ""}
      <div class="preco">${formatarPreco(precoFinal)}</div>
      ${Number(livro.desconto || 0) > 0 ? `<span class="desconto-badge">${livro.desconto}% OFF</span>` : ""}
    `;

    botoes = `
      <a class="btn btn-secundario" href="detalhes.html?id=${livro.id}">Ver detalhes</a>
      <button class="btn btn-favorito ${favorito ? "ativo" : ""}" onclick="alternarFavorito(${livro.id})">
        ${favorito ? "Favoritado" : "Favoritar"}
      </button>
      <button class="btn btn-secundario" onclick="adicionarAoCarrinho(${livro.id})">Adicionar ao carrinho</button>
    `;
  }

  return `
    <article class="livro-card">
      <img class="livro-capa" src="${livro.capa || ""}" alt="${livro.titulo}">
      <div class="livro-conteudo">
        <span class="tag ${livro.tipo}">${livro.tipo === "gratuito" ? "Gratuito" : "Pago"}</span>
        <h4>${livro.titulo}</h4>
        <div class="livro-info"><strong>Autor:</strong> ${livro.autor}</div>
        <div class="livro-info"><strong>Categoria:</strong> ${livro.categoria}</div>
        <div class="livro-info"><strong>Coleção:</strong> ${livro.colecao || "-"}</div>
        <div class="livro-info"><strong>Volume:</strong> ${livro.volume || 1}</div>
        <p class="livro-descricao">${livro.descricao}</p>
        ${precoHtml}
        <div class="acoes">${botoes}</div>
      </div>
    </article>
  `;
}

function atualizarResumo(livros) {
  const total = livros.length;
  const gratuitos = livros.filter(l => l.tipo === "gratuito").length;
  const pagos = livros.filter(l => l.tipo === "pago").length;
  const somatorioPagos = livros
    .filter(l => l.tipo === "pago")
    .reduce((acc, livro) => acc + calcularPrecoFinal(livro.preco, livro.desconto), 0);

  document.getElementById("resumoTotal").textContent = total;
  document.getElementById("resumoGratis").textContent = gratuitos;
  document.getElementById("resumoPagos").textContent = pagos;
  document.getElementById("resumoSomatorio").textContent = formatarPreco(somatorioPagos);
}

function renderizarCategorias() {
  const container = document.getElementById("listaCategorias");
  if (!container) return;

  const categorias = [...new Set(livrosCache.map(l => l.categoria).filter(Boolean))];

  container.innerHTML = categorias.map(cat => `
    <button class="chip-categoria ${categoriaSelecionada === cat ? "ativa" : ""}" onclick="selecionarCategoria('${String(cat).replace(/'/g, "\\'")}')">
      ${cat}
    </button>
  `).join("");
}

window.selecionarCategoria = function (categoria) {
  categoriaSelecionada = categoria;
  renderizarCategorias();
  renderizarLivros();
};

function renderizarLivros() {
  const lista = document.getElementById("listaLivros");
  const total = document.getElementById("totalLivros");
  const busca = document.getElementById("busca")?.value.toLowerCase().trim() || "";
  const filtroTipo = document.getElementById("filtroTipo")?.value || "todos";

  let livros = [...livrosCache];

  livros = livros.filter((livro) => {
    const texto = `
      ${livro.titulo || ""}
      ${livro.autor || ""}
      ${livro.categoria || ""}
      ${livro.descricao || ""}
      ${livro.colecao || ""}
      ${livro.volume || ""}
    `.toLowerCase();

    const atendeBusca = texto.includes(busca);
    const atendeTipo = filtroTipo === "todos" || livro.tipo === filtroTipo;
    const atendeCategoria = categoriaSelecionada === "todas" || livro.categoria === categoriaSelecionada;

    return atendeBusca && atendeTipo && atendeCategoria;
  });

  if (total) total.textContent = `${livros.length} livro(s)`;
  atualizarResumo(livros);

  if (!lista) return;

  if (livros.length === 0) {
    lista.innerHTML = `<div class="vazio">Nenhum livro encontrado.</div>`;
    return;
  }

  lista.innerHTML = livros.map(criarCardLivro).join("");
}

function renderizarFavoritos() {
  const lista = document.getElementById("listaFavoritos");
  const total = document.getElementById("totalFavoritos");
  if (!lista || !total) return;

  const favoritosIds = obterFavoritos();
  const favoritos = livrosCache.filter(l => favoritosIds.includes(l.id));

  total.textContent = `${favoritos.length} item(ns)`;

  if (favoritos.length === 0) {
    lista.innerHTML = `<div class="vazio">Nenhum favorito salvo.</div>`;
    return;
  }

  lista.innerHTML = favoritos.map(livro => `
    <div class="item-carrinho">
      <div>
        <h4>${livro.titulo}</h4>
        <p><strong>Autor:</strong> ${livro.autor}</p>
        <p><strong>Categoria:</strong> ${livro.categoria}</p>
      </div>
      <div class="acoes-item-carrinho">
        <a class="btn btn-secundario" href="detalhes.html?id=${livro.id}">Ver detalhes</a>
        <button class="btn btn-perigo" onclick="alternarFavorito(${livro.id})">Remover</button>
      </div>
    </div>
  `).join("");
}

window.adicionarAoCarrinho = function (idLivro) {
  const livro = livrosCache.find(l => l.id === idLivro);

  if (!livro || livro.tipo !== "pago") return;

  const carrinho = obterCarrinho();
  const itemExistente = carrinho.find(item => item.id === idLivro);

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({
      id: livro.id,
      titulo: livro.titulo,
      autor: livro.autor,
      preco: Number(livro.preco || 0),
      desconto: Number(livro.desconto || 0),
      quantidade: 1
    });
  }

  salvarCarrinho(carrinho);
  renderizarCarrinho();
  alert("Livro adicionado ao carrinho!");
};

window.removerDoCarrinho = function (idLivro) {
  const carrinho = obterCarrinho().filter(item => item.id !== idLivro);
  salvarCarrinho(carrinho);
  renderizarCarrinho();
};

window.alterarQuantidade = function (idLivro, delta) {
  const carrinho = obterCarrinho();
  const item = carrinho.find(i => i.id === idLivro);

  if (!item) return;

  item.quantidade += delta;

  if (item.quantidade <= 0) {
    window.removerDoCarrinho(idLivro);
    return;
  }

  salvarCarrinho(carrinho);
  renderizarCarrinho();
};

function renderizarCarrinho() {
  const listaCarrinho = document.getElementById("listaCarrinho");
  const totalItens = document.getElementById("totalItensCarrinho");
  const subtotalEl = document.getElementById("subtotalCarrinho");
  const totalEl = document.getElementById("totalCarrinho");
  if (!listaCarrinho || !totalItens || !subtotalEl || !totalEl) return;

  const carrinho = obterCarrinho();
  const quantidadeTotal = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  totalItens.textContent = `${quantidadeTotal} item(ns)`;

  if (carrinho.length === 0) {
    listaCarrinho.innerHTML = `<div class="vazio">Seu carrinho está vazio.</div>`;
    subtotalEl.textContent = formatarPreco(0);
    totalEl.textContent = formatarPreco(0);
    return;
  }

  let subtotal = 0;

  listaCarrinho.innerHTML = carrinho.map(item => {
    const precoFinal = calcularPrecoFinal(item.preco, item.desconto);
    const totalItem = precoFinal * item.quantidade;
    subtotal += totalItem;

    return `
      <div class="item-carrinho">
        <div>
          <h4>${item.titulo}</h4>
          <p><strong>Autor:</strong> ${item.autor}</p>
          <p><strong>Preço unitário:</strong> ${formatarPreco(precoFinal)}</p>
          <p><strong>Quantidade:</strong> ${item.quantidade}</p>
          <p><strong>Total:</strong> ${formatarPreco(totalItem)}</p>
        </div>

        <div class="acoes-item-carrinho">
          <button class="btn btn-secundario" onclick="alterarQuantidade(${item.id}, -1)">-</button>
          <button class="btn btn-secundario" onclick="alterarQuantidade(${item.id}, 1)">+</button>
          <button class="btn btn-perigo" onclick="removerDoCarrinho(${item.id})">Remover</button>
        </div>
      </div>
    `;
  }).join("");

  subtotalEl.textContent = formatarPreco(subtotal);
  totalEl.textContent = formatarPreco(subtotal);
}

function limparCarrinho() {
  salvarCarrinho([]);
  renderizarCarrinho();
}

function finalizarPorWhatsapp() {
  const carrinho = obterCarrinho();

  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio.");
    return;
  }

  let total = 0;

  const linhas = carrinho.map(item => {
    const precoFinal = calcularPrecoFinal(item.preco, item.desconto);
    const totalItem = precoFinal * item.quantidade;
    total += totalItem;
    return `- ${item.titulo} | Qtd: ${item.quantidade} | Total: ${formatarPreco(totalItem)}`;
  });

  const mensagem = `Olá! Tenho interesse nestes livros:\n\n${linhas.join("\n")}\n\nTotal do pedido: ${formatarPreco(total)}`;
  const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;

  window.open(url, "_blank");
}

async function inicializarPagina() {
  livrosCache = await obterLivros();
  renderizarCategorias();
  renderizarLivros();
  renderizarFavoritos();
  renderizarCarrinho();
}

document.getElementById("busca")?.addEventListener("input", renderizarLivros);
document.getElementById("filtroTipo")?.addEventListener("change", renderizarLivros);
document.getElementById("btnLimparCarrinho")?.addEventListener("click", limparCarrinho);
document.getElementById("btnFinalizarWhatsapp")?.addEventListener("click", finalizarPorWhatsapp);
document.getElementById("btnLimparCategoria")?.addEventListener("click", () => {
  categoriaSelecionada = "todas";
  renderizarCategorias();
  renderizarLivros();
});

inicializarPagina();