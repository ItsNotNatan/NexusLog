/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const solicitacoes = app.findCollectionByNameOrId("solicitacoes");
  if (solicitacoes) {
    const campoObsLog = new Field({
      name: 'observacoes_logistica',
      type: 'text',
      max: 5000
    });
    solicitacoes.fields.add(campoObsLog);
    app.save(solicitacoes);
  }
}, (app) => {
  const solicitacoes = app.findCollectionByNameOrId("solicitacoes");
  if (solicitacoes) {
    solicitacoes.fields.removeByName('observacoes_logistica');
    app.save(solicitacoes);
  }
});
