/// <reference path="../pb_data/types.d.ts" />
// =========================================================================
//  MIGRAÇÃO 2 - Adiciona a coluna 'fabricante' sem apagar dados
// =========================================================================

migrate((app) => {
  // Função auxiliar para criar campos de texto (idêntica à do init)
  const text = (name, opt = {}) => Object.assign({ type: 'text', name }, opt);

  // 1. Atualizar tabela 'estoque'
  const estoque = app.findCollectionByNameOrId("estoque");
  if (estoque) {
    estoque.fields.push(text('fabricante', { max: 150 }));
    app.save(estoque);
  }

  // 2. Atualizar tabela 'solicitacoes_itens'
  const solicitacoesItens = app.findCollectionByNameOrId("solicitacoes_itens");
  if (solicitacoesItens) {
    solicitacoesItens.fields.push(text('fabricante', { max: 150 }));
    app.save(solicitacoesItens);
  }

}, (app) => {
  // Lógica de reversão: caso precises de desfazer, ele remove a coluna
  const estoque = app.findCollectionByNameOrId("estoque");
  if (estoque) {
    estoque.fields = estoque.fields.filter(f => f.name !== 'fabricante');
    app.save(estoque);
  }

  const solicitacoesItens = app.findCollectionByNameOrId("solicitacoes_itens");
  if (solicitacoesItens) {
    solicitacoesItens.fields = solicitacoesItens.fields.filter(f => f.name !== 'fabricante');
    app.save(solicitacoesItens);
  }
});
