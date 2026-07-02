import React, { useState } from 'react';
import { User, MapPin, Calendar, Zap, Search, Package, Send, FileSpreadsheet, Trash2 } from 'lucide-react';
import CarregarArquivo from '../../components/CarregarArquivo/CarregarArquivo';
import { lerExcelParaItens } from '../../utils/excelUtils';

const estoqueDisponivel = [
  { desenhoSAP: 'TEXXX-0000022629', materialDescription: 'REPARTIDORES LÓGICOS 4 X M12 FÊMEA', numPecaFabricante: 'PROLOGANT4RP', fornecedor: 'SENSTRONIC', qtdFornecida: '199', referencia: '9095', unidadeMedida: 'NR', vendorDescription: 'SENSTRONIC DO BRASIL', wbs: 'BRBCBBB29-...', emissaoNF: '23/06/2026', recebNF: '30/06/2026', docCompras: '34026', poNetPrice: 'R$ 1.697,39', centro: 'BR06', deposito: '0020', alocacao: '002-B-004' },
  { desenhoSAP: 'TAL-S378006', materialDescription: 'CONECTOR IE FC 180 4X2', numPecaFabricante: '6GK1901-1BB11-2AA0', fornecedor: 'SIEMENS', qtdFornecida: '4', referencia: 'AR-366866', unidadeMedida: 'NR', vendorDescription: 'SIEMENS INFRAESTRUTURA', wbs: 'BRBRRCY21-...', emissaoNF: '23/06/2026', recebNF: '30/06/2026', docCompras: '34246', poNetPrice: 'R$ 161,77', centro: 'BR06', deposito: '0020', alocacao: '002-B-004' },
];

export default function MaterialEstoque() {
  const [itensSelecionados, setItensSelecionados] = useState([]);

  const removerItem = (idParaRemover) => {
    setItensSelecionados(prev => prev.filter(item => item.id !== idParaRemover));
  };

  // NOVA FUNÇÃO: Atualiza QUALQUER campo da tabela
  const atualizarCampo = (id, campo, novoValor) => {
    setItensSelecionados(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [campo]: novoValor } : item
      )
    );
  };

  const adicionarManualmente = (item, index) => {
    setItensSelecionados(prev => [...prev, {
      id: `manual-${Date.now()}-${index}`,
      ...item,
      qtdSelecionada: 1 
    }]);
  };

  return (
    <>
      {/* ... [O FORMULÁRIO SUPERIOR E A LISTA ESQUERDA MANTÊM-SE IGUAIS] ... */}
      
      {/* CORTADO AQUI POR BREVIDADE, MAS MANTÉM TUDO ATÉ AO THEAD DA TABELA */}
      
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        <div className="form-grid">
           {/* ... SEUS INPUTS DO FORMULÁRIO AQUI ... */}
        </div>
      </div>

      <div className="selecao-itens-grid">
        <div className="painel-lista">
           {/* ... ESTOQUE DISPONÍVEL (LADO ESQUERDO) ... */}
        </div>

        <div className="painel-lista">
          <div className="painel-lista-header">
            <div className="titulo-com-icone"><Package size={18} /> Itens Selecionados</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CarregarArquivo 
                variante="botao"
                accept=".xlsx, .xls"
                label="Importar Excel"
                icone={<FileSpreadsheet size={16} color="#10b981" />}
                onFileSelect={(arquivo) => {
                  lerExcelParaItens(arquivo)
                    .then(novosItens => setItensSelecionados(prev => [...prev, ...novosItens]))
                    .catch(erro => alert(erro));
                }}
              />
              <span className="badge-contagem bg-branco">{itensSelecionados.length}/25</span>
            </div>
          </div>

          {itensSelecionados.length === 0 ? (
            <div className="estado-vazio-selecao">
              <Package size={48} strokeWidth={1} />
              <p>Clique nos itens à esquerda ou importe um Excel do SAP</p>
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
                  {itensSelecionados.map((item) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => removerItem(item.id)} className="btn-deletar-linha">
                          <Trash2 size={16} />
                        </button>
                      </td>
                      
                      {/* CADA CÉLULA AGORA É UM INPUT INVISÍVEL! */}
                      <td style={{ minWidth: '220px' }}>
                        <input 
                          className="input-editavel-tabela texto-preto" 
                          value={item.materialDescription} 
                          onChange={(e) => atualizarCampo(item.id, 'materialDescription', e.target.value)} 
                        />
                      </td>
                      
                      <td>
                        <input 
                          className="input-editavel-tabela badge-partnumber" 
                          value={item.numPecaFabricante} 
                          onChange={(e) => atualizarCampo(item.id, 'numPecaFabricante', e.target.value)} 
                        />
                      </td>
                      
                      <td className="qtd-solicitada-destaque">
                        <input 
                          type="number" 
                          className="input-inline-tabela"
                          value={item.qtdSelecionada}
                          onChange={(e) => atualizarCampo(item.id, 'qtdSelecionada', e.target.value)}
                        />
                      </td>

                      <td>
                        <input 
                          className="input-editavel-tabela texto-cinza-claro" 
                          value={item.desenhoSAP} 
                          onChange={(e) => atualizarCampo(item.id, 'desenhoSAP', e.target.value)} 
                        />
                      </td>

                      <td>
                        <input 
                          className="input-editavel-tabela texto-cinza-escuro" 
                          value={item.fornecedor} 
                          onChange={(e) => atualizarCampo(item.id, 'fornecedor', e.target.value)} 
                        />
                      </td>

                      <td>
                        <input 
                          className="input-editavel-tabela texto-cinza" 
                          value={item.referencia} 
                          onChange={(e) => atualizarCampo(item.id, 'referencia', e.target.value)} 
                        />
                      </td>

                      <td>
                        <input 
                          className="input-editavel-tabela texto-cinza" 
                          style={{ width: '60px' }}
                          value={item.unidadeMedida} 
                          onChange={(e) => atualizarCampo(item.id, 'unidadeMedida', e.target.value)} 
                        />
                      </td>

                      <td>
                        <input 
                          className="input-editavel-tabela link-azul-fake" 
                          value={item.wbs} 
                          onChange={(e) => atualizarCampo(item.id, 'wbs', e.target.value)} 
                        />
                      </td>

                      <td>
                        <input 
                          className="input-editavel-tabela link-azul-fake" 
                          value={item.alocacao} 
                          onChange={(e) => atualizarCampo(item.id, 'alocacao', e.target.value)} 
                        />
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* BOTÃO FINAL DE ENVIO */}
      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul">
          <Send size={16} /> Enviar Solicitação
        </button>
      </div>
    </>
  );
}