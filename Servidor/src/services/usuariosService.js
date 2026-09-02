// =================================================================
// ARQUIVO: src/services/usuariosService.js
// DESCRICAO: Utilizadores no PocketBase (Coleção AUTH)
// =================================================================
const db = require('../db');
const { PB_URL } = require('../config/pocketbase');
const PocketBase = require('pocketbase/cjs');

// Registro do PocketBase -> formato que o front sempre conheceu.
const paraFront = (r) => ({
  id: r.id,
  nome_completo: r.nome_completo,
  email: r.email,
  cargo: db.txt(r.cargo),
  filial_padrao_id: db.txt(r.filial_padrao_id),
  filiais_acesso: Array.isArray(r.filiais_acesso) ? r.filiais_acesso : [],
  // Como as senhas agora estão criptografadas, devolvemos vazio para não quebrar o frontend
  senha: '',
  created_at: db.dt(r.created_at),
});

const listarUsuarios = async () => {
  const registros = await db.listar('usuarios', { sort: 'nome_completo' });
  return registros.map(paraFront);
};

const criarUsuario = async (dadosUsuario) => {
  const email = String(dadosUsuario.email || '').trim();

  // Mantemos a validação para o frontend receber a mensagem clara
  const jaExiste = await db.um('usuarios', db.f('email = {:email}', { email }));
  if (jaExiste) {
    const erro = new Error('Este e-mail já está registado.');
    erro.code = '23505'; 
    throw erro;
  }

  // ✨ MUDANÇA: Coleções Auth exigem password e passwordConfirm
  await db.criar('usuarios', {
    nome_completo: dadosUsuario.nome,
    email,
    emailVisibility: true,
    password: dadosUsuario.senha,        // Mapeado
    passwordConfirm: dadosUsuario.senha, // Mapeado
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
  
  // ✨ MUDANÇA: Se enviou senha nova, atualizamos os campos nativos
  if (dadosAtualizados.senha) {
    dadosMapeados.password = dadosAtualizados.senha;
    dadosMapeados.passwordConfirm = dadosAtualizados.senha;
  }
  
  if (dadosAtualizados.filiais_acesso) dadosMapeados.filiais_acesso = dadosAtualizados.filiais_acesso;

  if (Object.keys(dadosMapeados).length === 0) return true;

  await db.atualizar('usuarios', id, dadosMapeados);
  return true;
};

/**
 * Apaga um utilizador depois de confirmar a senha de quem pediu a exclusao.
 */
const deletarUsuarioComConfirmacao = async (idAlvo, idAdmin, senhaFornecida) => {
  const admin = await db.porId('usuarios', idAdmin);
  if (!admin) throw new Error('Não foi possível verificar a identidade do administrador.');

  // ✨ MUDANÇA: Como não temos a senha em texto, validamos fazendo um "login fantasma" no PocketBase
  try {
    const pbTest = new PocketBase(PB_URL);
    await pbTest.collection('usuarios').authWithPassword(admin.email, senhaFornecida);
  } catch (err) {
    throw new Error('A senha de confirmação está incorreta. Exclusão cancelada.');
  }

  const alvo = await db.porId('usuarios', idAlvo);
  if (!alvo) throw new Error('Utilizador não encontrado.');

  await db.remover('usuarios', idAlvo);
  return true;
};

module.exports = { listarUsuarios, criarUsuario, atualizarUsuario, deletarUsuarioComConfirmacao };
