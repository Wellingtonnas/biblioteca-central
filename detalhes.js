import { supabase } from "./supabase.js";

const CHAVE_CARRINHO = "biblioteca_central_carrinho_v3";
const CHAVE_FAVORITOS = "biblioteca_central_favoritos_v2";

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

async function obterLivroPorId(id) {
  const { data, error } = await supabase
    .from("livros")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

window.adicionarAoCarrinho = function (idLivro, livro) {
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
  alert("Livro adicionado ao carrinho!");
};

window.alternarFavorito = function (id) {
  const favoritos = obterFavoritos();
  const indice = favoritos.indexOf(id);

  if (indice >= 0) favoritos.splice(indice, 1);
  else favoritos.push(id);

  salvarFavoritos(favoritos);
  renderizarDetalhes();
};

function obterIdDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

async function renderizarDetalhes() {
  const container = document.getElementById("detalheLivro");
  const id = obterIdDaUrl();
  const livro = await obterLivroPorId(id);
  const favoritos = obterFavoritos();
  const ehFavorito = favoritos.includes(id);

  if (!livro) {
    container.innerHTML = `<div class="vazio">Livro não encontrado.</div>`;
    return;
  }

  let blocoPreco = `<div class="preco">Grátis</div>`;
  let acoes = `
    <div class="acoes">
      <a class="btn btn-secundario" href="index.html">Voltar</a>
      <button class="btn btn-favorito ${ehFavorito ? "ativo" : ""}" onclick="alternarFavorito(${livro.id})">
        ${ehFavorito ? "Favoritado" : "Favoritar"}
      </button>
      <a class="btn btn-primario" href="${livro.arquivo || "#"}" target="_blank">Ler / Baixar</a>
    </div>
  `;

  if (livro.tipo === "pago") {
    const precoFinal = calcularPrecoFinal(livro.preco, livro.desconto);

    blocoPreco = `
      ${Number(livro.desconto || 0) > 0 ? `<div class="preco-antigo">${formatarPreco(livro.preco)}</div>` : ""}
      <div class="preco">${formatarPreco(precoFinal)}</div>
      ${Number(livro.desconto || 0) > 0 ? `<span class="desconto-badge">${livro.desconto}% OFF</span>` : ""}
    `;

    acoes = `
      <div class="acoes">
        <a class="btn btn-secundario" href="index.html">Voltar</a>
        <button class="btn btn-favorito ${ehFavorito ? "ativo" : ""}" onclick="alternarFavorito(${livro.id})">
          ${ehFavorito ? "Favoritado" : "Favoritar"}
        </button>
        <button class="btn btn-secundario" onclick='adicionarAoCarrinho(${livro.id}, ${JSON.stringify(livro)})'>Adicionar ao carrinho</button>
        <a class="btn btn-primario" href="${livro.link_compra || "#"}" target="_blank">Comprar direto</a>
      </div>
    `;
  }

  container.innerHTML = `
    <section class="card-detalhe">
      <div class="detalhe-layout">
        <div>
          <img class="detalhe-imagem" src="${livro.capa || ""}" alt="Capa do livro ${livro.titulo}">
        </div>

        <div class="detalhe-conteudo">
          <span class="tag ${livro.tipo}">${livro.tipo === "gratuito" ? "Gratuito" : "Pago"}</span>
          <h2>${livro.titulo}</h2>
          <div class="livro-info"><strong>Autor:</strong> ${livro.autor}</div>
          <div class="livro-info"><strong>Categoria:</strong> ${livro.categoria}</div>
          <div class="livro-info"><strong>Coleção:</strong> ${livro.colecao || "-"}</div>
          <div class="livro-info"><strong>Volume:</strong> ${livro.volume || 1}</div>
          <p class="livro-descricao">${livro.descricao}</p>
          ${blocoPreco}
          ${acoes}
        </div>
      </div>
    </section>
  `;
}

renderizarDetalhes();