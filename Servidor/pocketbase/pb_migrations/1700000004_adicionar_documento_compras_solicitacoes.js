/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const solicitacoes = app.findCollectionByNameOrId('solicitacoes');

  if (solicitacoes) {
    const campoDocumentoCompras = new Field({
      name: 'documento_compras',
      type: 'text',
      max: 100
    });

    solicitacoes.fields.add(campoDocumentoCompras);
    app.save(solicitacoes);
  }
}, (app) => {
  const solicitacoes = app.findCollectionByNameOrId('solicitacoes');

  if (solicitacoes) {
    solicitacoes.fields.removeByName('documento_compras');
    app.save(solicitacoes);
  }
});
