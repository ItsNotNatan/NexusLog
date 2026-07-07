/**
 * Pega num valor (número ou texto) e formata para a moeda brasileira (R$).
 * Exemplo: 1500.5 -> "R$ 1.500,50"
 */
export const formatarDinheiro = (valor) => {
  // 1. Se o valor for vazio ou nulo, retorna zero formatado
  if (valor === null || valor === undefined || valor === '') {
    return 'R$ 0,00';
  }

  let numeroLimpo = valor;

  // 2. Se o valor vier como texto (string), precisamos limpá-lo antes de formatar
  if (typeof numeroLimpo === 'string') {
    // Remove "R$", letras e espaços. Deixa apenas números, pontos e vírgulas.
    numeroLimpo = numeroLimpo.replace(/[^\d.,-]/g, '');

    // Se o texto tiver ponto de milhar E vírgula decimal (ex: 1.500,50)
    if (numeroLimpo.includes('.') && numeroLimpo.includes(',')) {
      // Tira o ponto de milhar e troca a vírgula por ponto (fica 1500.50 para o JS entender)
      numeroLimpo = numeroLimpo.replace(/\./g, '').replace(',', '.');
    } 
    // Se tiver apenas vírgula (ex: 1500,50)
    else if (numeroLimpo.includes(',')) {
      numeroLimpo = numeroLimpo.replace(',', '.');
    }
  }

  // 3. Converte o texto limpo num número decimal real (float)
  const valorNumerico = parseFloat(numeroLimpo);

  // 4. Se a conversão falhar (não for um número válido), devolve zero
  if (isNaN(valorNumerico)) {
    return 'R$ 0,00';
  }

  // 5. A mágica do Javascript: Formata o número final no padrão do Brasil (BRL)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorNumerico);
};