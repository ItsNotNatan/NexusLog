/// <reference path="../pb_data/types.d.ts" />
// =========================================================================
//  NEXUSLOG - Schema inicial (conversao do Supabase/Postgres para PocketBase)
//  Origem: BancoDeDados.txt (DDL do Postgres) na raiz do repositorio.
//  Aplicado automaticamente pelo PocketBase no "serve".
//  API de migrations: PocketBase v0.23+ (new Collection / app.save / fields)
//
//  DECISOES DE CONVERSAO (importante para quem for mexer depois):
//
//  1) CHAVES ESTRANGEIRAS VIRAM CAMPOS DE TEXTO, nao "relation".
//     O codigo original sempre filtra na mao (.eq('solicitacao_id', id)) e
//     monta os "joins" no service. Texto simples e' mais previsivel do que
//     relation+expand e evita erro de validacao quando o valor vem nulo.
//
//  2) filiais.id era VARCHAR(10) ('BR02'). O id do PocketBase e' gerado por
//     ele mesmo, entao o codigo da filial vive no campo "codigo" (unico).
//     O service traduz codigo <-> id para a API continuar devolvendo
//     { id: 'BR02' } igual ao Supabase, sem mudar nada no front.
//
//  3) Os CHECK do Postgres (status/tipo/cargo) NAO viram campo "select".
//     Um valor fora da lista faria o PocketBase recusar a gravacao em
//     producao; como texto, o pior caso e' um dado estranho e nao uma falha.
//
//  4) NAO existe indice unico em solicitacoes.pl. No Postgres varias linhas
//     podiam ter pl = NULL; o PocketBase guarda "" (string vazia) e um
//     indice unico rejeitaria a segunda solicitacao sem PL.
//
//  5) packing_lists.numero_pl era SERIAL. O PocketBase nao tem
//     auto-incremento: o numero e' calculado no service (maior + 1), em fila,
//     para nao repetir.
// =========================================================================

migrate((app) => {
  // ---------------------------------------------------------------- helpers
  const text = (name, opt = {}) => Object.assign({ type: 'text', name }, opt);
  const number = (name, opt = {}) => Object.assign({ type: 'number', name }, opt);
  const bool = (name, opt = {}) => Object.assign({ type: 'bool', name }, opt);
  const json = (name, opt = {}) => Object.assign({ type: 'json', name, maxSize: 2000000 }, opt);
  const date = (name, opt = {}) => Object.assign({ type: 'date', name }, opt);
  const file = (name, opt = {}) => Object.assign({ type: 'file', name, maxSelect: 1 }, opt);

  const criadoEm = () => ({ type: 'autodate', name: 'created_at', onCreate: true, onUpdate: false });
  const editadoEm = () => ({ type: 'autodate', name: 'updated_at', onCreate: true, onUpdate: true });

  const make = (def) => {
    const c = new Collection(def);
    app.save(c);
    return c;
  };

  // 1) configuracoes -------------------------------------------------------
  // Postgres: chave VARCHAR(100) PRIMARY KEY / valor TEXT NOT NULL
  make({
    type: 'base',
    name: 'configuracoes',
    fields: [
      text('chave', { required: true, max: 100 }),
      text('valor', { max: 2000 }),
      criadoEm(),
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_configuracoes_chave` ON `configuracoes` (`chave`)'],
  });

  // 2) filiais -------------------------------------------------------------
  // "codigo" e' o antigo id do Postgres ('BR02', 'BR04', 'BR06').
  make({
    type: 'base',
    name: 'filiais',
    fields: [
      text('codigo', { required: true, max: 10 }),
      text('nome', { required: true, max: 100 }),
      text('cidade', { max: 100 }),
      criadoEm(),
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_filiais_codigo` ON `filiais` (`codigo`)'],
  });

  // 3) usuarios ------------------------------------------------------------
  // Colecao "base" (nao "auth"): o login continua sendo o JWT do Express,
  // exatamente como era no Supabase. A senha segue em texto puro, como no
  // sistema original - trocar para hash e' uma decisao separada.
  make({
    type: 'base',
    name: 'usuarios',
    fields: [
      text('email', { required: true, max: 255 }),
      text('senha', { required: true, max: 50 }),
      text('nome_completo', { required: true, max: 255 }),
      text('cargo', { max: 50 }),
      text('filial_padrao_id', { max: 10 }),
      json('filiais_acesso'),
      criadoEm(),
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_usuarios_email` ON `usuarios` (`email`)'],
  });

  // 4) materiais -----------------------------------------------------------
  make({
    type: 'base',
    name: 'materiais',
    fields: [
      text('desenho_sap', { max: 100 }),
      text('part_number', { max: 100 }),
      text('descricao', { max: 255 }),
      text('fornecedor', { max: 150 }),
      text('unidade_medida', { max: 20 }),
      number('valor_unitario'),
      criadoEm(),
    ],
  });

  // 5) estoque -------------------------------------------------------------
  make({
    type: 'base',
    name: 'estoque',
    fields: [
      text('material_id', { max: 50 }),
      text('filial_id', { max: 10 }),

      text('desenho_sap', { max: 100 }),
      text('part_number', { max: 100 }),
      text('descricao', { max: 255 }),

      text('fornecedor', { max: 150 }),
      text('referencia', { max: 100 }),
      text('unidade_medida', { max: 20 }),
      date('data_necessidade'),
      text('emissao_nf', { max: 20 }),
      text('receb_nf', { max: 20 }),
      number('valor_unitario'),
      text('centro', { max: 50 }),
      text('deposito', { max: 50 }),

      text('nf_entrada', { max: 100 }),
      text('documento_compras', { max: 100 }),
      text('wbs', { max: 100 }),
      text('nome_projeto', { max: 255 }),
      text('alocacao', { max: 100 }),

      bool('is_transferencia'),

      number('quantidade_disponivel'),
      number('quantidade_reservada'),
      text('status', { max: 50 }),
      criadoEm(),
      editadoEm(),
    ],
    indexes: [
      'CREATE INDEX `idx_estoque_filial` ON `estoque` (`filial_id`)',
      'CREATE INDEX `idx_estoque_part_number` ON `estoque` (`part_number`)',
    ],
  });

  // 6) historico_edicoes ---------------------------------------------------
  make({
    type: 'base',
    name: 'historico_edicoes',
    fields: [
      text('estoque_id', { max: 50 }),
      text('usuario', { max: 255 }),
      text('campo_alterado', { max: 100 }),
      text('valor_antigo', { max: 2000 }),
      text('valor_novo', { max: 2000 }),
      criadoEm(),
    ],
    indexes: ['CREATE INDEX `idx_historico_estoque` ON `historico_edicoes` (`estoque_id`)'],
  });

  // 7) solicitacoes --------------------------------------------------------
  // Sem indice unico em "pl": a maioria das solicitacoes nasce sem PL e o
  // PocketBase guardaria "" em todas elas (ver observacao 4 no topo).
  make({
    type: 'base',
    name: 'solicitacoes',
    fields: [
      text('ps', { required: true, max: 50 }),
      text('pl', { max: 50 }),

      text('usuario_id', { max: 50 }),
      text('nome_solicitante', { max: 255 }),
      text('tipo', { required: true, max: 50 }),
      text('filial_origem_id', { max: 10 }),
      text('destino', { max: 2000 }),
      text('wbs_origem', { max: 100 }),
      text('wbs_destino', { max: 100 }),
      date('data_necessidade'),

      date('data_entrega'),

      text('observacoes', { max: 5000 }),
      bool('entrega_urgente'),
      text('status', { max: 50 }),

      date('data_aprovacao_pl'),
      date('prazo_finalizacao_pl'),

      criadoEm(),
      editadoEm(),
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_solicitacoes_ps` ON `solicitacoes` (`ps`)',
      'CREATE INDEX `idx_solicitacoes_tipo_status` ON `solicitacoes` (`tipo`, `status`)',
      'CREATE INDEX `idx_solicitacoes_filial` ON `solicitacoes` (`filial_origem_id`)',
    ],
  });

  // 8) solicitacoes_itens --------------------------------------------------
  make({
    type: 'base',
    name: 'solicitacoes_itens',
    fields: [
      text('solicitacao_id', { max: 50 }),
      text('material_id', { max: 50 }),
      text('estoque_id', { max: 50 }),

      text('desenho_sap_manual', { max: 100 }),
      text('part_number_manual', { max: 100 }),
      text('descricao_manual', { max: 255 }),
      number('quantidade_solicitada'),
      text('unidade_medida_manual', { max: 20 }),
      number('valor_unitario_manual'),

      text('fornecedor', { max: 150 }),
      text('referencia', { max: 100 }),
      text('nf_entrada', { max: 100 }),
      text('wbs_element', { max: 100 }),
      text('nome_projeto', { max: 255 }),
      text('emissao_nf', { max: 20 }),
      text('receb_nf', { max: 20 }),
      text('documento_compras', { max: 100 }),
      text('centro', { max: 50 }),
      text('deposito', { max: 50 }),
      text('alocacao', { max: 100 }),

      criadoEm(),
    ],
    indexes: [
      'CREATE INDEX `idx_itens_solicitacao` ON `solicitacoes_itens` (`solicitacao_id`)',
      'CREATE INDEX `idx_itens_estoque` ON `solicitacoes_itens` (`estoque_id`)',
    ],
  });

  // 9) packing_lists -------------------------------------------------------
  // numero_pl era SERIAL; agora e' calculado no service (maior + 1).
  make({
    type: 'base',
    name: 'packing_lists',
    fields: [
      number('numero_pl', { required: true }),
      text('solicitacao_id', { required: true, max: 50 }),
      text('status', { max: 50 }),
      date('data_finalizacao'),
      criadoEm(),
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_pl_numero` ON `packing_lists` (`numero_pl`)',
      'CREATE UNIQUE INDEX `idx_pl_solicitacao` ON `packing_lists` (`solicitacao_id`)',
    ],
  });

  // 10) notas_fiscais ------------------------------------------------------
  make({
    type: 'base',
    name: 'notas_fiscais',
    fields: [
      text('solicitacao_id', { max: 50 }),
      text('numero_nf', { required: true, max: 100 }),
      date('data_emissao'),
      date('data_recebimento'),
      text('doc_compras', { max: 100 }),
      number('valor_total'),
      criadoEm(),
    ],
    indexes: [
      'CREATE INDEX `idx_nf_solicitacao` ON `notas_fiscais` (`solicitacao_id`)',
      'CREATE INDEX `idx_nf_numero` ON `notas_fiscais` (`numero_nf`)',
    ],
  });

  // 11) anexos -------------------------------------------------------------
  make({
    type: 'base',
    name: 'anexos',
    fields: [
      text('solicitacao_id', { max: 50 }),
      text('nome_arquivo', { required: true, max: 255 }),
      text('url_arquivo', { required: true, max: 2000 }),
      text('origem', { max: 50 }),
      criadoEm(),
    ],
    indexes: ['CREATE INDEX `idx_anexos_solicitacao` ON `anexos` (`solicitacao_id`)'],
  });

  // 12) documentos ---------------------------------------------------------
  // Substitui o bucket "documentos" do Supabase Storage. O arquivo em si fica
  // aqui; quem entrega para o navegador e' a API (rota /api/arquivos), entao
  // esta colecao continua fechada (so o superuser enxerga).
  make({
    type: 'base',
    name: 'documentos',
    fields: [
      file('arquivo', { required: true, maxSize: 52428800 }), // 50 MB por arquivo
      text('nome_original', { required: true, max: 255 }),
      criadoEm(),
    ],
  });
}, (app) => {
  // ------------------------------- rollback -------------------------------
  const nomes = [
    'documentos', 'anexos', 'notas_fiscais', 'packing_lists', 'solicitacoes_itens',
    'solicitacoes', 'historico_edicoes', 'estoque', 'materiais', 'usuarios',
    'filiais', 'configuracoes',
  ];
  for (const nome of nomes) {
    try { app.delete(app.findCollectionByNameOrId(nome)); } catch (e) { /* ja nao existe */ }
  }
});
