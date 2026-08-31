// =================================================================
// ARQUIVO: src/db.js
// DESCRICAO: Atalhos em cima do PocketBase para o resto do backend.
//
// O sistema nasceu no Supabase (PostgREST). Este arquivo concentra as
// diferencas de comportamento entre os dois bancos, para os services
// ficarem legiveis e nao repetirem o mesmo cuidado em cada consulta:
//
//   - Supabase devolvia NULL em coluna vazia; o PocketBase devolve "".
//     Datas vazias viravam "Invalid Date" no front - por isso dt().
//   - Datas do PocketBase vem como "2026-08-31 12:00:00.000Z" (com espaco
//     no lugar do "T"), que nem todo navegador aceita - dt() normaliza.
//   - .single() do Supabase devolvia erro PGRST116 quando nao achava nada;
//     aqui um() simplesmente devolve null.
//   - Valor vindo do usuario NUNCA entra no filtro por concatenacao:
//     usamos pb.filter() com parametros (o equivalente ao prepared statement).
// =================================================================
const { pb, withAuth } = require('./config/pocketbase');

// ----------------------------------------------------------------- filtros
// Monta um filtro seguro. Ex: f('email = {:email}', { email: 'a@b.com' })
const f = (expressao, parametros) => pb.filter(expressao, parametros);

// ------------------------------------------------------------------- datas
// Normaliza data do PocketBase para ISO. Campo vazio vira null (e nao ""),
// para o front continuar recebendo o mesmo que recebia do Supabase.
function dt(valor) {
  if (!valor) return null;
  const d = new Date(String(valor).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Data para gravar no PocketBase (aceita Date, string ISO ou vazio).
function paraData(valor) {
  if (!valor) return '';
  const d = valor instanceof Date ? valor : new Date(valor);
  return isNaN(d.getTime()) ? '' : d.toISOString().replace('T', ' ');
}

// Texto vazio do PocketBase vira null, como era no Postgres.
const txt = (valor) => (valor === '' || valor === undefined ? null : valor);

// --------------------------------------------------------------- consultas
// Lista tudo que casa com o filtro (o PocketBase pagina sozinho de 500 em 500).
async function listar(colecao, opcoes = {}) {
  return withAuth(() => pb.collection(colecao).getFullList({ batch: 500, ...opcoes }));
}

// Uma pagina só, com o total - equivalente ao .range() + { count: 'exact' }.
async function pagina(colecao, page, porPagina, opcoes = {}) {
  return withAuth(() => pb.collection(colecao).getList(page, porPagina, opcoes));
}

// Primeiro registro que casa, ou null. Substitui o .single() do Supabase.
async function um(colecao, filtro, opcoes = {}) {
  try {
    return await withAuth(() => pb.collection(colecao).getFirstListItem(filtro, opcoes));
  } catch (e) {
    if (e && e.status === 404) return null;
    throw e;
  }
}

// Busca por id, ou null se nao existir.
async function porId(colecao, id, opcoes = {}) {
  if (!id) return null;
  try {
    return await withAuth(() => pb.collection(colecao).getOne(String(id), opcoes));
  } catch (e) {
    if (e && e.status === 404) return null;
    throw e;
  }
}

// Equivalente ao "WHERE campo IN (...)" do SQL, que o PocketBase nao tem.
// Os ids sao quebrados em blocos para o filtro nao virar uma string gigante.
async function listarPorIds(colecao, campo, ids, opcoes = {}) {
  const unicos = [...new Set((ids || []).filter(Boolean).map(String))];
  if (unicos.length === 0) return [];

  const TAMANHO_BLOCO = 50;
  const encontrados = [];

  for (let i = 0; i < unicos.length; i += TAMANHO_BLOCO) {
    const bloco = unicos.slice(i, i + TAMANHO_BLOCO);
    const parametros = {};
    const expressao = bloco
      .map((valor, indice) => {
        parametros[`v${indice}`] = valor;
        return `${campo} = {:v${indice}}`;
      })
      .join(' || ');

    const parte = await listar(colecao, { ...opcoes, filter: f(expressao, parametros) });
    encontrados.push(...parte);
  }

  return encontrados;
}

// --------------------------------------------------------------- gravacoes
async function criar(colecao, dados) {
  return withAuth(() => pb.collection(colecao).create(dados));
}

async function criarVarios(colecao, listaDeDados) {
  const criados = [];
  for (const dados of listaDeDados) criados.push(await criar(colecao, dados));
  return criados;
}

async function atualizar(colecao, id, dados) {
  return withAuth(() => pb.collection(colecao).update(String(id), dados));
}

async function remover(colecao, id) {
  return withAuth(() => pb.collection(colecao).delete(String(id)));
}

// Apaga tudo que casa com o filtro (o PocketBase nao tem DELETE em lote).
async function removerOnde(colecao, filtro) {
  const registros = await listar(colecao, { filter: filtro, fields: 'id' });
  for (const r of registros) await remover(colecao, r.id);
  return registros.length;
}

// Atualiza tudo que casa com o filtro (idem: nao ha UPDATE em lote).
async function atualizarOnde(colecao, filtro, dados) {
  const registros = await listar(colecao, { filter: filtro, fields: 'id' });
  for (const r of registros) await atualizar(colecao, r.id, dados);
  return registros.length;
}

// ------------------------------------------------------------------- fila
// O Postgres resolvia numero_pl com SERIAL. Sem auto-incremento, dois pedidos
// aprovados ao mesmo tempo poderiam ler o mesmo "maior numero" e colidir.
// Esta fila garante que o trecho critico roda um de cada vez neste processo.
let ultimaDaFila = Promise.resolve();
function emFila(tarefa) {
  const resultado = ultimaDaFila.then(tarefa, tarefa);
  // a fila segue viva mesmo se a tarefa falhar
  ultimaDaFila = resultado.catch(() => {});
  return resultado;
}

module.exports = {
  pb, withAuth, f,
  dt, paraData, txt,
  listar, pagina, um, porId, listarPorIds,
  criar, criarVarios, atualizar, remover, removerOnde, atualizarOnde,
  emFila,
};
