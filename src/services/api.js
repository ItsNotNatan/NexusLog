// =================================================================
// FICHEIRO: src/services/api.js
// DESCRICAO: Comunicacao com o Backend (NexusLog self-hosted)
//
// O sistema roda numa maquina da empresa, e nao mais no Render. O endereco
// do servidor NAO fica fixo no codigo: ele e' deduzido do endereco em que a
// pagina foi aberta. Assim, se o IP da maquina mudar, nada precisa ser
// recompilado - basta abrir o site pelo IP novo.
// =================================================================

// Porta da API no servidor (o front e' servido na 8083, a API na 3002).
const PORTA_API = 3002;

/**
 * Endereco do servidor, SEM o /api no fim.
 * Serve para o WebSocket (Socket.io) e para montar links de anexos.
 */
export function urlDoServidor() {
  // Se alguem definir VITE_API_URL no build, ela manda.
  const configurada = import.meta.env.VITE_API_URL;
  if (configurada) return configurada.replace(/\/api\/?$/, '');

  if (typeof window === 'undefined') return `http://localhost:${PORTA_API}`;

  const { hostname, protocol } = window.location;
  const ehLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  // Em producao: mesmo IP/host da pagina, na porta da API.
  return ehLocal ? `http://localhost:${PORTA_API}` : `${protocol}//${hostname}:${PORTA_API}`;
}

/** Endereco base das rotas da API (com o /api no fim). */
export function urlDaApi() {
  return `${urlDoServidor()}/api`;
}

/**
 * Monta o endereco completo de um anexo.
 * As URLs sao guardadas no banco em formato relativo ("/api/arquivos/..."),
 * justamente para continuarem validas se o IP do servidor mudar.
 */
export function resolverUrlArquivo(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url; // anexo antigo, com endereco completo
  return `${urlDoServidor()}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Envia arquivos para o servidor e devolve a lista pronta para gravar
 * como anexo: [{ nome_arquivo, url_arquivo }].
 * Substitui o upload que era feito direto no Supabase Storage.
 */
export async function enviarArquivos(arquivos) {
  const lista = Array.from(arquivos || []);
  if (lista.length === 0) return [];

  const formulario = new FormData();
  for (const arquivo of lista) formulario.append('arquivos', arquivo);

  const token = localStorage.getItem('@NexusLog:token');

  const resposta = await fetch(`${urlDaApi()}/arquivos/upload`, {
    method: 'POST',
    // Sem Content-Type: o navegador precisa definir o boundary do multipart.
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formulario,
  });

  const textoBruto = await resposta.text();
  let dados = {};
  if (textoBruto) {
    try {
      dados = JSON.parse(textoBruto);
    } catch {
      throw new Error('O servidor nao respondeu como esperado ao guardar o anexo.');
    }
  }

  if (!resposta.ok || !dados.sucesso) {
    throw new Error(dados.erro || 'Falha ao guardar o anexo no servidor.');
  }

  return dados.dados || [];
}

/**
 * Funcao principal para fazer pedidos ao servidor (Backend).
 */
export async function apiFetch(endpoint, options = {}) {
  // 1. Recupera o token de seguranca guardado no navegador do utilizador
  const token = localStorage.getItem('@NexusLog:token');

  // 2. Monta os cabecalhos (Headers) necessarios para a comunicacao em JSON
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // 3. Garante que o caminho da rota (endpoint) tem sempre uma barra '/' no inicio
  const rotaFormatada = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const urlCompleta = `${urlDaApi()}${rotaFormatada}`;

  try {
    // 4. Executa o pedido ao servidor
    const resposta = await fetch(urlCompleta, { ...options, headers });

    // 5. Lemos primeiro como texto bruto: assim um erro em HTML nao vira
    // "Unexpected end of JSON input" e a mensagem real aparece no console.
    const textoBruto = await resposta.text();

    let dados = {};

    // 6. Se o servidor enviou algum texto, tentamos transforma-lo em JSON
    if (textoBruto) {
      try {
        dados = JSON.parse(textoBruto);
      } catch {
        console.error('❌ O Servidor nao devolveu JSON. Devolveu isto:', textoBruto);
        throw new Error(
          `O servidor devolveu uma resposta inesperada (Status ${resposta.status}). ` +
          'Verifique se o NexusLog esta a correr na maquina servidora.'
        );
      }
    }

    // 7. Avalia se o Backend devolveu uma resposta de sucesso (200 a 299)
    if (!resposta.ok) {
      throw new Error(dados.erro || dados.mensagem || `Erro reportado pelo servidor (Status ${resposta.status})`);
    }

    // 8. Se tudo correu bem, devolvemos os dados em JSON para a pagina usar
    return dados;
  } catch (error) {
    // 9. Se a rede falhar completamente (servidor desligado, fora da rede...)
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      console.error(`❌ [ERRO DE REDE] Falha ao ligar a: ${urlCompleta}`);
      throw new Error(
        'Nao foi possivel falar com o servidor do NexusLog. ' +
        'Confirme que a maquina servidora esta ligada e que voce esta na rede da empresa.'
      );
    }

    throw error;
  }
}
