/// <reference path="../pb_data/types.d.ts" />
// =========================================================================
//  NEXUSLOG - Schema inicial (PocketBase)
// =========================================================================

migrate((app) => {
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

  // 1) configuracoes
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

  // 2) filiais
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

  // 3) usuarios - AGORA É DO TIPO "AUTH"
  make({
    type: 'auth', // <-- A MUDANÇA PRINCIPAL
    name: 'usuarios',
    fields: [
      // O PocketBase injeta automaticamente os campos 'email', 'password' e 'verified'
      text('nome_completo', { required: true, max: 255 }),
      text('cargo', { max: 50 }),
      text('filial_padrao_id', { max: 10 }),
      json('filiais_acesso'),
      criadoEm(),
    ],
  });

  // 4) materiais
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

  // 5) estoque
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

  // 6) historico_edicoes
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

  // 7) solicitacoes
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

  // 8) solicitacoes_itens
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

  // 9) packing_lists
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

  // 10) notas_fiscais
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

  // 11) anexos
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

  // 12) documentos
  make({
    type: 'base',
    name: 'documentos',
    fields: [
      file('arquivo', { required: true, maxSize: 52428800 }),
      text('nome_original', { required: true, max: 255 }),
      criadoEm(),
    ],
  });
}, (app) => {
  const nomes = [
    'documentos', 'anexos', 'notas_fiscais', 'packing_lists', 'solicitacoes_itens',
    'solicitacoes', 'historico_edicoes', 'estoque', 'materiais', 'usuarios',
    'filiais', 'configuracoes',
  ];
  for (const nome of nomes) {
    try { app.delete(app.findCollectionByNameOrId(nome)); } catch (e) { }
  }
});
