// =================================================================
// ARQUIVO: src/services/arquivosService.js
// DESCRICAO: Guarda e entrega os anexos - substitui o Supabase Storage
//
// Antes o navegador falava direto com o bucket "documentos" do Supabase e
// guardava a URL publica dele. Agora o arquivo vai para a colecao
// "documentos" do PocketBase (fechada, so o superuser enxerga) e quem
// entrega para o navegador e' esta API.
//
// A URL gravada no banco e' RELATIVA ("/api/arquivos/<id>/<nome>"). Assim,
// se o IP da maquina mudar, os anexos antigos continuam abrindo - o front
// monta o endereco completo na hora de exibir.
// =================================================================
const { pb, withAuth } = require('../config/pocketbase');
const db = require('../db');

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8092';

/**
 * Guarda um arquivo enviado pelo navegador.
 * @param {Buffer} buffer conteudo do arquivo
 * @param {string} nomeOriginal nome que o utilizador ve
 * @param {string} tipo mime-type
 * @returns {{ nome_arquivo: string, url_arquivo: string }}
 */
const salvarArquivo = async (buffer, nomeOriginal, tipo) => {
  const nomeLimpo = String(nomeOriginal || 'arquivo').replace(/[\r\n]/g, '').slice(0, 200);

  const formulario = new FormData();
  formulario.append('arquivo', new Blob([buffer], { type: tipo || 'application/octet-stream' }), nomeLimpo);
  formulario.append('nome_original', nomeLimpo);

  const registro = await withAuth(() => pb.collection('documentos').create(formulario));

  return {
    nome_arquivo: nomeLimpo,
    url_arquivo: `/api/arquivos/${registro.id}/${encodeURIComponent(nomeLimpo)}`,
  };
};

/**
 * Busca o arquivo no PocketBase para a API repassar ao navegador.
 * A colecao e' privada, entao pedimos um token temporario de arquivo.
 * @returns {{ corpo: ReadableStream, tipo: string, nome: string }|null}
 */
const obterArquivo = async (idDocumento) => {
  const registro = await db.porId('documentos', idDocumento);
  if (!registro || !registro.arquivo) return null;

  const token = await withAuth(() => pb.files.getToken());
  const endereco =
    `${PB_URL}/api/files/documentos/${registro.id}/${encodeURIComponent(registro.arquivo)}` +
    `?token=${encodeURIComponent(token)}`;

  const resposta = await fetch(endereco);
  if (!resposta.ok) return null;

  return {
    corpo: resposta.body,
    tipo: resposta.headers.get('content-type') || 'application/octet-stream',
    nome: registro.nome_original || registro.arquivo,
  };
};

module.exports = { salvarArquivo, obterArquivo };
