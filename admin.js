import { supabase } from "./supabase.js";

let livrosCache = [];

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

async function obterUsuarioAtual() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  return data.user;
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

async function inserirLivro(livro) {
  const { error } = await supabase
    .from("livros")
    .insert([livro]);

  if (error) throw error;
}

async function atualizarLivroNoBanco(id, livro) {
  const { error } = await supabase
    .from("livros")
    .update(livro)
    .eq("id", id);

  if (error) throw error;
}

async function excluirLivroDoBanco(id) {
  const { error } = await supabase
    .from("livros")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

function atualizarCamposPorTipo() {
  const tipo = document.getElementById("tipo").value;
  document.getElementById("campoPreco").style.display = tipo === "pago" ? "block" : "none";
  document.getElementById("campoDesconto").style.display = tipo === "pago" ? "block" : "none";
  document.getElementById("campoCompra").style.display = tipo === "pago" ? "block" : "none";
}

function limparFormulario() {
  document.getElementById("formLivro").reset();
  document.getElementById("livroId").value = "";
  document.getElementById("tituloFormulario").textContent = "Novo Livro";
  document.getElementById("btnSalvar").textContent = "Salvar Livro";
  document.getElementById("tipo").value = "gratuito";
  document.getElementById("volume").value = 1;
  atualizarCamposPorTipo();
}

function preencherFormularioParaEdicao(livro) {
  document.getElementById("livroId").value = livro.id;
  document.getElementById("titulo").value = livro.titulo || "";
  document.getElementById("autor").value = livro.autor || "";
  document.getElementById("categoria").value = livro.categoria || "";
  document.getElementById("colecao").value = livro.colecao || "";
  document.getElementById("volume").value = livro.volume || 1;
  document.getElementById("tipo").value = livro.tipo || "gratuito";
  document.getElementById("capa").value = livro.capa || "";
  document.getElementById("arquivo").value = livro.arquivo || "";
  document.getElementById("preco").value = livro.preco || "";
  document.getElementById("desconto").value = livro.desconto || "";
  document.getElementById("linkCompra").value = livro.link_compra || "";
  document.getElementById("descricao").value = livro.descricao || "";

  document.getElementById("tituloFormulario").textContent = "Editar Livro";
  document.getElementById("btnSalvar").textContent = "Atualizar Livro";

  atualizarCamposPorTipo();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.editarLivro = function (id) {
  const livro = livrosCache.find(l => l.id === id);
  if (!livro) return;
  preencherFormularioParaEdicao(livro);
};

window.excluirLivro = async function (id) {
  const confirmar = confirm("Deseja realmente excluir este livro?");
  if (!confirmar) return;

  try {
    await excluirLivroDoBanco(id);
    alert("Livro excluído com sucesso!");
    await carregarLivrosAdmin();
    limparFormulario();
  } catch (error) {
    console.error(error);
    alert("Erro ao excluir livro.");
  }
};

function atualizarResumoAdmin(livros) {
  const total = livros.length;
  const gratuitos = livros.filter(l => l.tipo === "gratuito").length;
  const pagos = livros.filter(l => l.tipo === "pago").length;
  const somatorio = livros
    .filter(l => l.tipo === "pago")
    .reduce((acc, livro) => acc + calcularPrecoFinal(livro.preco, livro.desconto), 0);

  document.getElementById("adminTotal").textContent = total;
  document.getElementById("adminGratis").textContent = gratuitos;
  document.getElementById("adminPagos").textContent = pagos;
  document.getElementById("adminSomatorio").textContent = formatarPreco(somatorio);
}

function renderizarListaAdmin() {
  const lista = document.getElementById("listaAdmin");
  const contador = document.getElementById("contadorAdmin");

  contador.textContent = `${livrosCache.length} livro(s)`;
  atualizarResumoAdmin(livrosCache);

  if (livrosCache.length === 0) {
    lista.innerHTML = `<div class="vazio">Nenhum livro cadastrado ainda.</div>`;
    return;
  }

  lista.innerHTML = livrosCache.map((livro) => {
    const precoFinal = calcularPrecoFinal(livro.preco, livro.desconto);

    return `
      <div class="item-admin">
        <div>
          <h4>${livro.titulo}</h4>
          <p><strong>Autor:</strong> ${livro.autor}</p>
          <p><strong>Categoria:</strong> ${livro.categoria}</p>
          <p><strong>Coleção:</strong> ${livro.colecao || "-"}</p>
          <p><strong>Volume:</strong> ${livro.volume || 1}</p>
          <p><strong>Tipo:</strong> ${livro.tipo === "gratuito" ? "Gratuito" : "Pago"}</p>
          ${
            livro.tipo === "pago"
              ? `<p><strong>Preço final:</strong> ${formatarPreco(precoFinal)}</p>`
              : `<p><strong>Acesso:</strong> Gratuito</p>`
          }
        </div>

        <div class="acoes-admin">
          <button class="btn btn-secundario" onclick="editarLivro(${livro.id})">Editar</button>
          <button class="btn btn-perigo" onclick="excluirLivro(${livro.id})">Excluir</button>
        </div>
      </div>
    `;
  }).join("");
}

async function carregarLivrosAdmin() {
  livrosCache = await obterLivros();
  renderizarListaAdmin();
}

async function atualizarTelaLogin() {
  const areaLogin = document.getElementById("areaLogin");
  const areaPainel = document.getElementById("areaPainel");

  const user = await obterUsuarioAtual();

  if (user) {
    areaLogin.style.display = "none";
    areaPainel.style.display = "block";
    await carregarLivrosAdmin();
  } else {
    areaLogin.style.display = "block";
    areaPainel.style.display = "none";
  }
}

document.getElementById("formLogin").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("usuarioAdmin").value.trim();
  const password = document.getElementById("senhaAdmin").value.trim();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error(error);
    alert("Email ou senha inválidos.");
    return;
  }

  alert("Login realizado com sucesso!");
  await atualizarTelaLogin();
});

document.getElementById("btnLogout").addEventListener("click", async function () {
  await supabase.auth.signOut();
  alert("Você saiu do painel.");
  await atualizarTelaLogin();
});

document.getElementById("tipo").addEventListener("change", atualizarCamposPorTipo);
document.getElementById("btnLimpar").addEventListener("click", limparFormulario);

document.getElementById("formLivro").addEventListener("submit", async function (e) {
  e.preventDefault();

  const id = document.getElementById("livroId").value;
  const titulo = document.getElementById("titulo").value.trim();
  const autor = document.getElementById("autor").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const colecao = document.getElementById("colecao").value.trim();
  const volume = Number(document.getElementById("volume").value || 1);
  const descricao = document.getElementById("descricao").value.trim();
  const capa = document.getElementById("capa").value.trim();
  const arquivo = document.getElementById("arquivo").value.trim();
  const tipo = document.getElementById("tipo").value;
  const preco = Number(document.getElementById("preco").value || 0);
  const desconto = Number(document.getElementById("desconto").value || 0);
  const linkCompra = document.getElementById("linkCompra").value.trim();

  if (!titulo || !autor || !categoria || !descricao) {
    alert("Preencha os campos obrigatórios.");
    return;
  }

  if (tipo === "gratuito" && !arquivo) {
    alert("Informe o link/caminho do PDF do livro gratuito.");
    return;
  }

  if (tipo === "pago" && !linkCompra) {
    alert("Informe o link de compra ou WhatsApp do livro pago.");
    return;
  }

  const dadosLivro = {
    titulo,
    autor,
    categoria,
    colecao,
    volume,
    descricao,
    capa,
    tipo,
    preco: tipo === "pago" ? preco : 0,
    desconto: tipo === "pago" ? desconto : 0,
    arquivo: tipo === "gratuito" ? arquivo : "",
    link_compra: tipo === "pago" ? linkCompra : ""
  };

  try {
    if (id) {
      await atualizarLivroNoBanco(Number(id), dadosLivro);
      alert("Livro atualizado com sucesso!");
    } else {
      await inserirLivro(dadosLivro);
      alert("Livro cadastrado com sucesso!");
    }

    limparFormulario();
    await carregarLivrosAdmin();
  } catch (error) {
    console.error(error);
    alert("Erro ao salvar livro.");
  }
});

supabase.auth.onAuthStateChange(async () => {
  await atualizarTelaLogin();
});

atualizarCamposPorTipo();
atualizarTelaLogin();