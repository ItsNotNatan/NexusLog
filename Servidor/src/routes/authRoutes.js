const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { pb } = require('../config/pocketbase'); // Usa a instância do PB

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    // ✨ O PocketBase faz a validação da senha automaticamente!
    const authData = await pb.collection('usuarios').authWithPassword(email, senha);
    const usuario = authData.record;

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, cargo: usuario.cargo },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      sucesso: true, token,
      usuario: {
        id: usuario.id, nome: usuario.nome_completo, email: usuario.email,
        cargo: usuario.cargo, filial: usuario.filial_padrao_id,
        filiais_acesso: usuario.filiais_acesso || [],
      },
    });
  } catch (error) {
    res.status(401).json({ sucesso: false, erro: 'E-mail ou senha incorretos.' });
  }
});

router.post('/recuperar-senha', async (req, res) => {
  try {
    // ✨ O PocketBase envia o e-mail sozinho!
    await pb.collection('usuarios').requestPasswordReset(req.body.email);
    res.status(200).json({ sucesso: true });
  } catch (error) {
    res.status(200).json({ sucesso: true }); // Retorna sucesso para evitar rastreio
  }
});

router.post('/redefinir-senha', async (req, res) => {
  try {
    // ✨ O PocketBase valida o token dele e atualiza a senha sozinho!
    await pb.collection('usuarios').confirmPasswordReset(
      req.body.token, req.body.novaSenha, req.body.novaSenha
    );
    res.status(200).json({ sucesso: true });
  } catch (error) {
    res.status(400).json({ sucesso: false, erro: 'Link expirado ou senha inválida.' });
  }
});

module.exports = router;
