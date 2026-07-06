import React, { useState } from 'react';
// Adicionamos o ícone 'Plus' na importação
import { User, MapPin, Calendar, Search, Package, Send, FileSpreadsheet, Trash2, Plus } from 'lucide-react';

// NOSSOS COMPONENTES E HOOKS
import CarregarArquivo from '../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../hooks/useProcessadorExcel';

// DADOS MOCK (Estoque da esquerda)
const estoqueDisponivel = [
  { desenhoSAP: 'TEXXX-0000022629', materialDescription: 'REPARTIDORES LÓGICOS 4 X M12 FÊMEA', numPecaFabricante: 'PROLOGANT4RP', fornecedor: 'SENSTRONIC', qtdFornecida: '199', referencia: '9095', unidadeMedida: 'NR', vendorDescription: 'SENSTRONIC DO BRASIL', wbs: 'BRBCBBB29-...', emissaoNF: '23/06/2026', recebNF: '30/06/2026', docCompras: '34026', poNetPrice: 'R$ 1.697,39', centro: 'BR06', deposito: '0020', alocacao: '002-B-004' },
  { desenhoSAP: 'TAL-S378006', materialDescription: 'CONECTOR IE FC 180 4X2', numPecaFabricante: '6GK1901-1BB11-2AA0', fornecedor: 'SIEMENS', qtdFornecida: '4', referencia: 'AR-366866', unidadeMedida: 'NR', vendorDescription: 'SIEMENS INFRAESTRUTURA', wbs: 'BRBRRCY21-...', emissaoNF: '23/06/2026', recebNF: '30/06/2026', docCompras: '34246', poNetPrice: 'R$ 161,77', centro: 'BR06', deposito: '0020', alocacao: '002-B-004' },
];

export default function MaterialEstoque() {
  const [itensSelecionados, setItensSelecionados] = useState([]);
  
  // INICIA O MAESTRO (Hook de Processamento)
  const processador = useProcessadorExcel();

  // FUNÇÃO DE IMPORTAÇÃO (Já preserva os itens existentes graças ao ...prev)
  const handleImportarExcel = async (arquivo) => {
    const novosItens = await processador.iniciarProcessamento(arquivo);
    
    // Trava de segurança: Só adiciona se for realmente um Array válido
    if (novosItens && Array.isArray(novosItens)) {
      // O 'prev' aqui garante que o que foi digitado manualmente não se apague!
      setItensSelecionados(prev => [...prev, ...novosItens]);
    }
  };

  const removerItem = (idParaRemover) => {
    setItensSelecionados(prev => prev.filter(item => item.id !== idParaRemover));
  };

  const atualizarCampo = (id, campo, novoValor) => {
    setItensSelecionados(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [campo]: novoValor } : item
      )
    );
  };

  // Adiciona itens clicando na lista da esquerda
  const adicionarManualmente = (item, index) => {
    setItensSelecionados(prev => [...prev, {
      id: `manual-${Date.now()}-${index}`,
      ...item,
      qtdSelecionada: 1 
    }]);
  };

  // NOVA FUNÇÃO: Adiciona uma linha totalmente em branco na tabela
  const adicionarLinhaEmBranco = () => {
    setItensSelecionados(prev => [
      ...prev,
      {
        id: `linha-vazia-${Date.now()}`,
        desenhoSAP: '',
        materialDescription: '',
        numPecaFabricante: '',
        fornecedor: '',
        qtdSelecionada: 1,
        referencia: '',
        unidadeMedida: 'Unid',
        wbs: '',
        alocacao: ''
      }
    ]);
  };

  // Garante que é sempre um array antes de renderizar (evita ecrã branco)
  const listaSegura = Array.isArray(itensSelecionados) ? itensSelecionados : [];

  return (
    <>
      {/* TELA DE CARREGAMENTO (MODAL) */}
      <ModalProcessamento 
        estaProcessando={processador.estaProcessando}
        concluido={processador.concluido}
        estadoProgresso={processador.estadoProgresso}
        resultado={processador.resultado}
        erroFatal={processador.erroFatal}
        onClose={processador.resetarProcessador}
      />

      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME DO SOLICITANTE *</label>
            <input type="text" className="input-campo" placeholder="Seu nome completo" />
          </div>
          <div className="input-grupo">
            <label>WBS / CENTRO DE CUSTO *</label>
            <input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" />
          </div>
          <div className="input-grupo">
            <label><MapPin size={14} /> FILIAL DE ORIGEM</label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" />
              <input type="text" className="input-campo" value="BR04 — Goiana, PE" readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>
          <div className="input-grupo row-span-2">
            <label><MapPin size={14} /> DESTINO *</label>
            <textarea className="input-campo" placeholder="Local de destino do material"></textarea>
          </div>
          <div className="input-grupo">
            <label><Calendar size={14} /> DATA DE NECESSIDADE *</label>
            <input type="date" className="input-campo" />
          </div>
          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo" placeholder="Informações adicionais..." rows="2"></textarea>
          </div>
        </div>
      </div>

      <div className="selecao-itens-grid">
        <div className="painel-lista">
          <div className="painel-lista-header">
            <h3>Estoque Disponível</h3>
            <span className="badge-contagem">{estoqueDisponivel.length} itens</span>
          </div>
          <div className="pesquisa-estoque">
            <Search size={18} className="icone-pesquisa-estoque" />
            <input type="text" placeholder="Buscar por SAP, PN, Descrição..." />
          </div>
          <div className="lista-rolavel">
            {estoqueDisponivel.map((item, index) => (
              <div key={`estoque-${index}`} className="item-estoque-card" onClick={() => adicionarManualmente(item, index)}>
                <strong className="item-pn">{item.numPecaFabricante}</strong>
                <p className="item-desc">{item.materialDescription}</p>
                <div className="item-rodape">
                  <span className="item-saldo">Saldo: <strong>{item.qtdFornecida} {item.unidadeMedida}</strong></span>
                  <span className="item-alocacao">{item.alocacao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="painel-lista">
          <div className="painel-lista-header">
            <div className="titulo-com-icone"><Package size={18} /> Itens Selecionados</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              
              {/* BOTÃO PARA ADICIONAR LINHA MANUALMENTE */}
              <button 
                onClick={adicionarLinhaEmBranco} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  padding: '6px 12px', backgroundColor: '#ffffff', 
                  border: '1px solid #cbd5e1', borderRadius: '8px', 
                  fontSize: '0.75rem', fontWeight: '600', color: '#475569', 
                  cursor: 'pointer' 
                }}
              >
                <Plus size={16} /> Nova Linha
              </button>

              <CarregarArquivo 
                variante="botao"
                accept=".xlsx, .xls"
                label="Importar Excel"
                icone={<FileSpreadsheet size={16} color="#10b981" />}
                onFileSelect={handleImportarExcel}
              />

              <span className="badge-contagem bg-branco">{listaSegura.length}/25</span>
            </div>
          </div>

          {listaSegura.length === 0 ? (
            <div className="estado-vazio-selecao">
              <Package size={48} strokeWidth={1} />
              <p>Clique nos itens à esquerda, adicione uma linha manual ou importe um Excel do SAP</p>
            </div>
          ) : (
            <div className="scroll-tabela-solicitacao">
              <table className="tabela-solicitacao-dados">
                <thead>
                  <tr>
                    <th>AÇÕES</th>
                    <th>MATERIAL DESCRIPTION</th>
                    <th>Nº PEÇA FABRICANTE</th>
                    <th>QTD. SOLICITADA</th>
                    <th>DESENHO SAP</th>
                    <th>FORNECEDOR</th>
                    <th>REFERÊNCIA</th>
                    <th>UNIDADE</th>
                    <th>WBS</th>
                    <th>ALOCAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {listaSegura.map((item) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => removerItem(item.id)} className="btn-deletar-linha">
                          <Trash2 size={16} />
                        </button>
                      </td>
                      <td style={{ minWidth: '220px' }}>
                        <input className="input-editavel-tabela texto-preto" value={item.materialDescription || ''} onChange={(e) => atualizarCampo(item.id, 'materialDescription', e.target.value)} placeholder="Descrição do item" />
                      </td>
                      <td>
                        <input className="input-editavel-tabela badge-partnumber" value={item.numPecaFabricante || ''} onChange={(e) => atualizarCampo(item.id, 'numPecaFabricante', e.target.value)} placeholder="PN" />
                      </td>
                      <td className="qtd-solicitada-destaque">
                        <input type="number" className="input-inline-tabela" value={item.qtdSelecionada || 1} onChange={(e) => atualizarCampo(item.id, 'qtdSelecionada', e.target.value)} />
                      </td>
                      <td>
                        <input className="input-editavel-tabela texto-cinza-claro" value={item.desenhoSAP || ''} onChange={(e) => atualizarCampo(item.id, 'desenhoSAP', e.target.value)} placeholder="SAP" />
                      </td>
                      <td>
                        <input className="input-editavel-tabela texto-cinza-escuro" value={item.fornecedor || ''} onChange={(e) => atualizarCampo(item.id, 'fornecedor', e.target.value)} placeholder="Fornecedor" />
                      </td>
                      <td>
                        <input className="input-editavel-tabela texto-cinza" value={item.referencia || ''} onChange={(e) => atualizarCampo(item.id, 'referencia', e.target.value)} placeholder="Ref" />
                      </td>
                      <td>
                        <input className="input-editavel-tabela texto-cinza" style={{ width: '60px' }} value={item.unidadeMedida || ''} onChange={(e) => atualizarCampo(item.id, 'unidadeMedida', e.target.value)} placeholder="Unid" />
                      </td>
                      <td>
                        <input className="input-editavel-tabela link-azul-fake" value={item.wbs || ''} onChange={(e) => atualizarCampo(item.id, 'wbs', e.target.value)} placeholder="WBS" />
                      </td>
                      <td>
                        <input className="input-editavel-tabela link-azul-fake" value={item.alocacao || ''} onChange={(e) => atualizarCampo(item.id, 'alocacao', e.target.value)} placeholder="Alocação" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul">
          <Send size={16} /> Enviar Solicitação
        </button>
      </div>
    </>
  );
}