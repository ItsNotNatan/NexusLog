// =================================================================
// FICHEIRO: src/services/api.js
// DESCRIÇÃO: Serviço de comunicação com o Backend no Render
// =================================================================

// Lê a URL do Render configurada no painel ou usa o localhost como fallback local
const BASE_URL = import.meta.env.VITE_API_URL || 'http://https://backend-zcrj.onrender.com/api';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('@NexusLog:token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const rotaFormatada = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const urlCompleta = `${BASE_URL}${rotaFormatada}`;

  try {
    const resposta = await fetch(urlCompleta, {
      ...options,
      headers,
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || dados.mensagem || `Erro no servidor (${resposta.status})`);
    }

    return dados;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      console.error(`❌ [ERRO DE CONEXÃO] Não foi possível alcançar: ${urlCompleta}`);
      throw new Error(`Falha na comunicação com o servidor (${BASE_URL}). Verifique se o serviço no Render está ativo.`);
    }

    throw error;
  }
}