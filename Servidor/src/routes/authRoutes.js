// =================================================================
// ARQUIVO: src/routes/authRoutes.js
// DESCRICAO: Login com geracao de Token JWT (agora sobre o PocketBase)
//
// O login continua sendo do Express, e nao do PocketBase: a colecao
// "usuarios" e' do tipo "base" e a senha e' conferida aqui, igual ao que
// o Supabase fazia. O que mudou foi so de onde o utilizador e' lido.
// =================================================================
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

/**
 * @route   POST /api/auth/login
 * @desc    Autentica o utilizador e devolve um Token JWT
 * @access  Publico
 */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  // 1. VALIDACAO BASICA DOS CAMPOS
  if (!email || !senha) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Por favor, introduza o e-mail e a senha.',
    });
  }

  try {
    // 2. CONSULTA AO BANCO
    // A senha e' comparada aqui (e nao no filtro) para o banco nao registar
    // a senha nos logs de consulta.
    const usuario = await db.um('usuarios', db.f('email = {:email}', { email: String(email).trim() }));

    // 3. VERIFICACAO DE CREDENCIAIS
    if (!usuario || usuario.senha !== senha) {
      return res.status(401).json({
        sucesso: false,
        erro: 'E-mail ou senha incorretos.',
      });
    }

    // 4. GERACAO DO TOKEN JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        cargo: usuario.cargo,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 5. RESPOSTA DE SUCESSO (mesmo formato de sempre)
    res.status(200).json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso! Bem-vindo ao NexusLog.',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome_completo,
        email: usuario.email,
        cargo: usuario.cargo,
        filial: usuario.filial_padrao_id,
        filiais_acesso: Array.isArray(usuario.filiais_acesso) ? usuario.filiais_acesso : [],
      },
    });
  } catch (error) {
    console.error('Erro critico na rota de login:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Ocorreu um erro interno no servidor ao tentar processar o login.',
    });
  }
});

module.exports = router;
