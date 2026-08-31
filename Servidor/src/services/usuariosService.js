// =================================================================
// ARQUIVO: src/services/usuariosService.js
// DESCRICAO: Utilizadores no PocketBase
//
// A colecao "usuarios" e' do tipo "base" (nao "auth"): o login continua
// sendo feito pelo Express com JWT, exatamente como era no Supabase.
// =================================================================
const db = require('../db');

// Registro do PocketBase -> formato que o front sempre conheceu.
const paraFront = (r) => ({
  id: r.id,
  nome_completo: r.nome_completo,
  email: r.email,
  cargo: db.txt(r.cargo),
  filial_padrao_id: db.txt(r.filial_padrao_id),
  filiais_acesso: Array.isArray(r.filiais_acesso) ? r.filiais_acesso : [],
  senha: r.senha,
  created_at: db.dt(r.created_at),
});

const listarUsuarios = async () => {
  const registros = await db.listar('usuarios', { sort: 'nome_completo' });
  return registros.map(paraFront);
};

const criarUsuario = async (dadosUsuario) => {
  const email = String(dadosUsuario.email || '').trim();

  // O indice unico ja barraria; aqui o erro sai com a mensagem certa.
  const jaExiste = await db.um('usuarios', db.f('email = {:email}', { email }));
  if (jaExiste) {
    const erro = new Error('Este e-mail ja esta registado.');
    erro.code = '23505'; // mesmo codigo do Postgres que o controller ja trata
    throw erro;
  }

  await db.criar('usuarios', {
    nome_completo: dadosUsuario.nome,
    email,
    senha: dadosUsuario.senha,
    cargo: dadosUsuario.cargo,
    filial_padrao_id: dadosUsuario.filial_padrao_id || dadosUsuario.filial || '',
    filiais_acesso: dadosUsuario.filiais_acesso || [],
  });

  return true;
};

const atualizarUsuario = async (id, dadosAtualizados) => {
  const dadosMapeados = {};

  if (dadosAtualizados.nome) dadosMapeados.nome_completo = dadosAtualizados.nome;
  if (dadosAtualizados.email) dadosMapeados.email = dadosAtualizados.email;
  if (dadosAtualizados.cargo) dadosMapeados.cargo = dadosAtualizados.cargo;
  if (dadosAtualizados.filial_padrao_id || dadosAtualizados.filial) {
    dadosMapeados.filial_padrao_id = dadosAtualizados.filial_padrao_id || dadosAtualizados.filial;
  }
  if (dadosAtualizados.senha) dadosMapeados.senha = dadosAtualizados.senha;
  if (dadosAtualizados.filiais_acesso) dadosMapeados.filiais_acesso = dadosAtualizados.filiais_acesso;

  if (Object.keys(dadosMapeados).length === 0) return true;

  await db.atualizar('usuarios', id, dadosMapeados);
  return true;
};

/**
 * Apaga um utilizador depois de confirmar a senha de quem pediu a exclusao.
 */
const deletarUsuarioComConfirmacao = async (idAlvo, idAdmin, senhaFornecida) => {
  // 1. Buscar a senha real do administrador
  const admin = await db.porId('usuarios', idAdmin);
  if (!admin) throw new Error('Nao foi possivel verificar a identidade do administrador.');

  // 2. Conferir a senha
  if (admin.senha !== senhaFornecida) {
    throw new Error('A senha de confirmacao esta incorreta. Exclusao cancelada.');
  }

  // 3. Apagar o utilizador alvo
  const alvo = await db.porId('usuarios', idAlvo);
  if (!alvo) throw new Error('Utilizador nao encontrado.');

  await db.remover('usuarios', idAlvo);
  return true;
};

module.exports = { listarUsuarios, criarUsuario, atualizarUsuario, deletarUsuarioComConfirmacao };
