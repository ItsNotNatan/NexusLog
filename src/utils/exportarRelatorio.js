/**
 * Utilitário para exportar relatórios de solicitações com nomenclatura atualizada (PL).
 * @param {Array} dados - Lista de solicitações tratadas.
 * @param {string} nomeArquivo - Nome do ficheiro retornado no download.
 */
export const exportarRelatorioPL = (dados = [], nomeArquivo = 'Relatorio_Packing_Lists') => {
  if (!dados || dados.length === 0) {
    alert('Não há dados disponíveis para exportação.');
    return;
  }

  // Definição dos cabeçalhos atualizados
  const cabecalhos = [
    'ID Solicitação',
    'Tipo',
    'Solicitante',
    'WBS',
    'Nº da PL',
    'Status',
    'Data Solicitação',
    'Data Entrega'
  ];

  // Mapeamento das linhas respeitando o fallback de campos legados
  const linhasFormatadas = dados.map(item => [
    `"${item.id || ''}"`,
    `"${item.tipo || ''}"`,
    `"${item.solicitante || ''}"`,
    `"${item.wbs || ''}"`,
    `"${item.pl || item.bs || '-'}"`,
    `"${item.status || ''}"`,
    `"${item.dataSolicitacao || ''}"`,
    `"${item.dataEntrega || ''}"`
  ]);

  const conteudoCSV = [
    cabecalhos.join(';'),
    ...linhasFormatadas.map(e => e.join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};