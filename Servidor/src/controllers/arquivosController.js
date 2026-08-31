// src/controllers/arquivosController.js
const { Readable } = require('stream');
const service = require('../services/arquivosService');

// POST /api/arquivos/upload  (multipart, campo "arquivos")
const enviar = async (req, res) => {
  try {
    const arquivos = req.files || [];
    if (arquivos.length === 0) {
      return res.status(400).json({ sucesso: false, erro: 'Nenhum arquivo recebido.' });
    }

    const salvos = [];
    for (const arquivo of arquivos) {
      salvos.push(await service.salvarArquivo(arquivo.buffer, arquivo.originalname, arquivo.mimetype));
    }

    res.status(201).json({ sucesso: true, dados: salvos });
  } catch (error) {
    console.error('[Erro ao guardar anexo]:', error);
    res.status(500).json({ sucesso: false, erro: 'Falha ao guardar o anexo no servidor.' });
  }
};

// GET /api/arquivos/:id/:nome  -> entrega o arquivo ao navegador
const baixar = async (req, res) => {
  try {
    const arquivo = await service.obterArquivo(req.params.id);
    if (!arquivo) return res.status(404).send('Arquivo não encontrado.');

    res.setHeader('Content-Type', arquivo.tipo);
    // "inline": PDF e imagem abrem na aba; o resto o navegador oferece baixar.
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    Readable.fromWeb(arquivo.corpo).pipe(res);
  } catch (error) {
    console.error(`[Erro ao entregar arquivo ${req.params.id}]:`, error);
    res.status(500).send('Falha ao abrir o arquivo.');
  }
};

module.exports = { enviar, baixar };
