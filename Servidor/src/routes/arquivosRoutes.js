// =================================================================
// ARQUIVO: src/routes/arquivosRoutes.js
// DESCRICAO: Upload e leitura dos anexos (substitui o Supabase Storage)
// =================================================================
const express = require('express');
const multer = require('multer');
const router = express.Router();
const ctrl = require('../controllers/arquivosController');

// Arquivo fica na memoria so o tempo de repassar ao PocketBase.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 }, // 50 MB por arquivo
});

// 🟢 PUBLICA: o cliente anexa documentos sem estar logado, como era no Supabase.
router.post('/upload', upload.array('arquivos', 20), ctrl.enviar);

// 🟢 PUBLICA: abrir o anexo. O nome no fim da URL e' so para o navegador
// sugerir o nome certo ao baixar - quem identifica o arquivo e' o id.
router.get('/:id/:nome', ctrl.baixar);
router.get('/:id', ctrl.baixar);

module.exports = router;
