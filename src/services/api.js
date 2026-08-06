// =================================================================
// FICHEIRO: src/services/api.js
// DESCRIÇÃO: Serviço de comunicação com o Backend no Render
// =================================================================

// Lê a URL do Render configurada no painel ou usa o localhost como fallback local
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Função principal para fazer pedidos ao servidor (Backend).
 * Inclui tratamento de erros para quando o Render está "adormecido".
 */
export async function apiFetch(endpoint, options = {}) {
  // 1. Recupera o token de segurança guardado no navegador do utilizador
  const token = localStorage.getItem('@NexusLog:token');

  // 2. Monta os cabeçalhos (Headers) necessários para a comunicação em JSON
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // 3. Garante que o caminho da rota (endpoint) tem sempre uma barra '/' no início
  const rotaFormatada = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const urlCompleta = `${BASE_URL}${rotaFormatada}`;

  try {
    // 4. Executa o pedido ao servidor
    const resposta = await fetch(urlCompleta, {
      ...options,
      headers,
    });

    // 5. O NOSSO ESCUDO DE PROTEÇÃO! Lemos primeiro como Texto Bruto (Raw Text)
    // Assim evitamos o erro "Unexpected end of JSON input" se o Render enviar HTML
    const textoBruto = await resposta.text();
    
    let dados = {};

    // 6. Se o servidor enviou algum texto, tentamos transformá-lo em JSON
    if (textoBruto) {
      try {
        dados = JSON.parse(textoBruto);
      } catch (erroJson) {
        // Se a conversão falhar, é porque o servidor enviou HTML de erro ou está a ligar
        console.error("❌ O Servidor não devolveu JSON. Devolveu isto:", textoBruto);
        throw new Error(`O servidor está a iniciar ou sobrecarregado (Status ${resposta.status}). O Render demora cerca de 50s a acordar. Aguarda um momento e tenta de novo!`);
      }
    }

    // 7. Avalia se o Backend devolveu uma resposta de sucesso (códigos 200 a 299)
    if (!resposta.ok) {
      throw new Error(dados.erro || dados.mensagem || `Erro reportado pelo servidor (Status ${resposta.status})`);
    }

    // 8. Se tudo correu bem, devolvemos os dados em JSON para a página usar
    return dados;
    
  } catch (error) {
    // 9. Se a rede falhar completamente (ex: sem internet ou servidor totalmente offline)
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      console.error(`❌ [ERRO DE REDE] Falha ao ligar a: ${urlCompleta}`);
      throw new Error(`A comunicação com o servidor falhou. Se o site acabou de ser aberto, o servidor no Render está a ligar. Aguarda 1 minuto e tenta novamente.`);
    }

    // Lança qualquer erro formatado (seja o nosso aviso amigável ou um erro real)
    throw error;
  }
}