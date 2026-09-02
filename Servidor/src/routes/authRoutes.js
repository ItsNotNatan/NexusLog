// =================================================================
// ARQUIVO: src/routes/authRoutes.js
// DESCRICAO: Login, Recuperação e Redefinição de Senha
// =================================================================
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../db');

// Configuração do transportador de e-mail (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Autentica o utilizador e devolve um Token JWT
 */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ sucesso: false, erro: 'Por favor, introduza o e-mail e a senha.' });
  }

  try {
    const usuario = await db.um('usuarios', db.f('email = {:email}', { email: String(email).trim() }));

    if (!usuario || usuario.senha !== senha) {
      return res.status(401).json({ sucesso: false, erro: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, cargo: usuario.cargo },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso!',
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
    console.error('Erro no login:', error);
    res.status(500).json({ sucesso: false, erro: 'Erro interno no servidor.' });
  }
});

/**
 * @route   POST /api/auth/recuperar-senha
 * @desc    Envia um e-mail com link (JWT de 1h) para redefinir a senha
 */
router.post('/recuperar-senha', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ sucesso: false, erro: 'O e-mail é obrigatório.' });
  }

  try {
    // Verifica se o usuário existe
    const usuario = await db.um('usuarios', db.f('email = {:email}', { email: String(email).trim() }));
    
    // Por segurança (evitar rastreio de e-mails válidos), devolvemos sucesso mesmo se não existir, 
    // mas só enviamos e-mail se existir.
    if (!usuario) {
      return res.status(200).json({ sucesso: true, mensagem: 'Se o e-mail existir, as instruções foram enviadas.' });
    }

    // Gera um token temporário válido por 1 hora, guardando apenas o ID do usuário
    const resetToken = jwt.sign(
      { id: usuario.id, tipo: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const urlFrontend = process.env.URL_FRONTEND || 'http://127.0.0.1:8083';
    const linkRecuperacao = `${urlFrontend}/redefinir-senha?token=${resetToken}`;

    const mailOptions = {
      from: `"STOCKLog Sistema" <${process.env.EMAIL_USER}>`,
      to: usuario.email,
      subject: 'Recuperação de Senha - STOCKLog',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Recuperação de Senha</h2>
          <p>Olá, <strong>${usuario.nome_completo}</strong>.</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta no sistema STOCKLog.</p>
          <p>Clique no botão abaixo para criar uma nova senha. Este link é válido por 1 hora.</p>
          <div style="margin: 30px 0;">
            <a href="${linkRecuperacao}" style="background-color: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Redefinir Minha Senha</a>
          </div>
          <p style="font-size: 12px; color: #666;">Se não solicitou esta alteração, ignore este e-mail.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ sucesso: true, mensagem: 'E-mail de recuperação enviado com sucesso.' });

  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({ sucesso: false, erro: 'Falha ao processar o pedido de recuperação.' });
  }
});

/**
 * @route   POST /api/auth/redefinir-senha
 * @desc    Valida o token JWT e atualiza a senha no PocketBase
 */
router.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = req.body;

  if (!token || !novaSenha || novaSenha.length < 6) {
    return res.status(400).json({ sucesso: false, erro: 'Token inválido ou senha muito curta.' });
  }

  try {
    // Descodifica e verifica se o token ainda é válido
    const descodificado = jwt.verify(token, process.env.JWT_SECRET);
    
    if (descodificado.tipo !== 'reset' || !descodificado.id) {
      return res.status(400).json({ sucesso: false, erro: 'Token inválido para esta operação.' });
    }

    const usuario = await db.porId('usuarios', descodificado.id);
    
    if (!usuario) {
      return res.status(404).json({ sucesso: false, erro: 'Utilizador não encontrado.' });
    }

    // Atualiza a senha no PocketBase (texto puro, conforme a sua arquitetura atual)
    await db.atualizar('usuarios', usuario.id, { senha: novaSenha });

    res.status(200).json({ sucesso: true, mensagem: 'Senha alterada com sucesso.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ sucesso: false, erro: 'O link expirou. Por favor, solicite um novo.' });
    }
    res.status(500).json({ sucesso: false, erro: 'Falha ao redefinir a senha.' });
  }
});

module.exports = router;
