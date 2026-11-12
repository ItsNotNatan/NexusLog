/**
 * Pega num valor (número ou texto) e formata para a moeda brasileira (R$).
 * Exemplo: 1500.5 -> "R$ 1.500,50"
 */
export const formatarDinheiro = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return 'R$ 0,00';
  }

  let numeroLimpo = valor;

  if (typeof numeroLimpo === 'string') {
    numeroLimpo = numeroLimpo.replace(/[^\d.,-]/g, '');
    if (numeroLimpo.includes('.') && numeroLimpo.includes(',')) {
      numeroLimpo = numeroLimpo.replace(/\./g, '').replace(',', '.');
    } else if (numeroLimpo.includes(',')) {
      numeroLimpo = numeroLimpo.replace(',', '.');
    }
  }

  const valorNumerico = parseFloat(numeroLimpo);

  if (isNaN(valorNumerico)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorNumerico);
};

/**
 * Formata o valor em tempo real para moeda (R$) enquanto o utilizador digita.
 */
export const formatarDinheiroTempoReal = (valorOriginal) => {
  if (!valorOriginal) return '';
  const apenasNumeros = valorOriginal.replace(/\D/g, '');

  if (apenasNumeros === '') return '';
  const valorDecimal = parseInt(apenasNumeros, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorDecimal);
};

// Formata WBS: Força maiúsculas e permite apenas letras, números e hífens
export const formatarWBS = (valor) => {
  if (!valor) return '';
  return String(valor).toUpperCase().replace(/[^A-Z0-9-]/g, '');
};

// NORMALIZAÇÃO ABSOLUTA: Remove espaços duplos e garante maiúsculas
export const normalizarString = (txt) => {
  if (!txt) return '';
  return String(txt).trim().replace(/\s+/g, ' ').toUpperCase();
};

/**
 * Extrai a entidade principal (Fornecedor ou Fabricante).
 * Regra: Utiliza o fallback se fornecedor for inválido, e extrai apenas
 * a primeira palavra (mantendo os hífens intactos, cortando no espaço).
 */
export const extrairEntidadePrincipal = (fornecedor, fabricante) => {
  let entidade = fornecedor;

  // Fallback Inteligente: Se fornecedor vier vazio, nulo, ou apenas traços
  if (!entidade || typeof entidade !== 'string' || entidade.trim() === '' || /^[-]+$/.test(entidade.trim())) {
    entidade = fabricante;
  }

  // Se o fabricante também for inválido, retorna vazio
  if (!entidade || typeof entidade !== 'string' || entidade.trim() === '' || /^[-]+$/.test(entidade.trim())) {
    return '';
  }

  // Limpa os espaços, passa para maiúsculas e extrai a primeira palavra cortando pelos espaços
  return entidade.trim().toUpperCase().split(/\s+/)[0];
};
