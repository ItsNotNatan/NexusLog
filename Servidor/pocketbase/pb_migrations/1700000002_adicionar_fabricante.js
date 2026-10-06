/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // === ADICIONAR NA TABELA ESTOQUE ===
  const estoque = app.findCollectionByNameOrId("estoque");
  if (estoque) {
    // A forma mais segura de adicionar campos nas versões recentes do PocketBase
    const campoFabricanteEstoque = new Field({
      name: 'fabricante',
      type: 'text',
      max: 150
    });
    estoque.fields.add(campoFabricanteEstoque);
    app.save(estoque);
  }

  // === ADICIONAR NA TABELA SOLICITACOES_ITENS ===
  const solicitacoesItens = app.findCollectionByNameOrId("solicitacoes_itens");
  if (solicitacoesItens) {
    const campoFabricanteItens = new Field({
      name: 'fabricante',
      type: 'text',
      max: 150
    });
    solicitacoesItens.fields.add(campoFabricanteItens);
    app.save(solicitacoesItens);
  }

}, (app) => {
  // === REVERSÃO (REMOVER CAMPOS) ===
  const estoque = app.findCollectionByNameOrId("estoque");
  if (estoque) {
    estoque.fields.removeByName('fabricante');
    app.save(estoque);
  }

  const solicitacoesItens = app.findCollectionByNameOrId("solicitacoes_itens");
  if (solicitacoesItens) {
    solicitacoesItens.fields.removeByName('fabricante');
    app.save(solicitacoesItens);
  }
});
