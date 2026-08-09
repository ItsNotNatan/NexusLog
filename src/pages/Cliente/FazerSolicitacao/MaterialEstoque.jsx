import React, { useState, useEffect, useContext } from "react";
import {
  User,
  MapPin,
  Calendar,
  Package,
  Send,
  Trash2,
  Zap
} from "lucide-react";

import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';

import GerenciadorAnexos from "../../../components/GerenciadorAnexos/GerenciadorAnexos";
import SeletorEstoqueLateral from "../../../components/SeletorEstoqueLateral/SeletorEstoqueLateral";
import { supabase } from "../../../supabaseClient";
import { apiFetch } from '../../../services/api';

export default function MaterialEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  const [formDados, setFormDados] = useState({
    nome: "",
    wbs: "",
    destino: "",
    dataNecessidade: "",
    observacoes: "",
    entregaUrgente: false,
    justificativaUrgencia: "",
  });

  const [dataMinima, setDataMinima] = useState("");

  useEffect(() => {
    const hoje = new Date();
    const timezoneOffset = hoje.getTimezoneOffset() * 60000;
    const localISOTime = new Date(hoje.getTime() - timezoneOffset).toISOString().split("T")[0];
    setDataMinima(localISOTime);
  }, []);

  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [estoqueDisponivel, setEstoqueDisponivel] = useState([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);

  useEffect(() => {
    const buscarEstoqueReal = async () => {
      try {
        const resultado = await apiFetch("/estoque/listar");

        if (resultado.sucesso) {
          const itensComSaldo = resultado.dados
            .filter((item) => item.quantidade_disponivel > 0)
            .map((item) => ({
              idBD: item.id,
              desenhoSAP: item.desenho_sap_manual || item.desenho_sap || "-",
              materialDescription: item.descricao_manual || item.descricao || "-",
              numPecaFabricante: item.part_number_manual || item.part_number || "-",
              fornecedor: item.fornecedor || "-",
              qtdFornecida: item.quantidade_disponivel || 0,
              nf: item.nf_entrada || "-",
              referencia: "-",
              unidadeMedida: item.unidade_medida_manual || item.unidade_medida || "Unid",
              vendorDescription: item.descricao_manual || item.descricao || "-",
              wbs: item.wbs_element || item.wbs || "-",
              alocacao: item.alocacao || "-",
              isTransferencia: item.is_transferencia || false
            }));

          setEstoqueDisponivel(itensComSaldo);
        } else {
          console.error("Erro retornado do servidor:", resultado.erro);
        }
      } catch (error) {
        console.error("Falha ao buscar dados do estoque:", error.message);
      } finally {
        setCarregandoEstoque(false);
      }
    };

    buscarEstoqueReal();
  }, []);

  const removerItem = (idParaRemover) => {
    setItensSelecionados((prev) => prev.filter((item) => item.id !== idParaRemover));
  };

  const atualizarCampo = (id, campo, novoValor) => {
    setItensSelecionados((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (campo === "qtdSelecionada") {
            let valorValidado = novoValor === '' ? '' : parseInt(novoValor, 10);

            if (valorValidado !== '') {
              if (isNaN(valorValidado) || valorValidado < 1) valorValidado = 1;
              if (item.qtdFornecida && valorValidado > item.qtdFornecida) {
                valorValidado = item.qtdFornecida;
              }
            }
            return { ...item, [campo]: valorValidado };
          }
          return { ...item, [campo]: novoValor };
        }
        return item;
      })
    );
  };

  const adicionarItemDoEstoque = (item, index) => {
    if (itensSelecionados.length >= 25) {
      showAlert("Limite Atingido", "Atingiu o limite máximo de 25 itens para esta solicitação.", "warning");
      return;
    }

    // Verifica se o item já foi adicionado
    const itemJaExiste = itensSelecionados.some(i => i.estoque_id === item.idBD);
    if (itemJaExiste) {
      showAlert("Item Duplicado", "Este material já foi adicionado à sua lista.", "info");
      return;
    }

    setItensSelecionados((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}-${index}`,
        estoque_id: item.idBD || null,
        ...item,
        qtdSelecionada: 1,
      },
    ]);
  };

  const handleEnviar = async () => {
    if (!formDados.nome || !formDados.wbs || !formDados.destino || !formDados.dataNecessidade) {
      showAlert("Campos Obrigatórios", "Por favor, preencha todos os campos obrigatórios do solicitante (*).", "warning");
      return;
    }

    if (formDados.dataNecessidade && formDados.dataNecessidade < dataMinima) {
      showAlert("Data Inválida", "A Data de Necessidade não pode ser anterior ao dia de hoje. Por favor, corrija no calendário.", "warning");
      return;
    }

    if (formDados.entregaUrgente && !formDados.justificativaUrgencia.trim()) {
      showAlert("Justificativa Pendente", "Como marcou a entrega como Urgente, é obrigatório preencher a justificativa do atraso.", "warning");
      return;
    }

    if (itensSelecionados.length === 0) {
      showAlert("Lista Vazia", "Adicione pelo menos um item do estoque à solicitação.", "warning");
      return;
    }

    const itensIncompletos = itensSelecionados.some(
      (i) => !i.numPecaFabricante || !i.materialDescription || !i.qtdSelecionada
    );

    if (itensIncompletos) {
      showAlert("Itens Incompletos", "Verifique as quantidades em todas as linhas da tabela. A quantidade não pode estar vazia.", "warning");
      return;
    }

    const anexosProcessados = [];
    if (anexos.length > 0) {
      for (const arquivo of anexos) {
        const extensao = arquivo.name.split(".").pop();
        const nomeUnico = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const caminhoNoStorage = `uploads/${nomeUnico}`;

        const { error: erroUpload } = await supabase.storage.from("documentos").upload(caminhoNoStorage, arquivo);

        if (erroUpload) {
          console.error("Erro ao subir arquivo:", erroUpload);
          showAlert("Erro no Anexo", `Falha ao anexar o ficheiro: ${arquivo.name}`, "error");
          return;
        }

        const { data: linkPublico } = supabase.storage.from("documentos").getPublicUrl(caminhoNoStorage);

        anexosProcessados.push({
          nome_arquivo: arquivo.name,
          url_arquivo: linkPublico.publicUrl,
        });
      }
    }

    let observacoesFinais = formDados.observacoes;
    if (formDados.entregaUrgente) {
      observacoesFinais = `[URGÊNCIA/ATRASO: ${formDados.justificativaUrgencia}] ${observacoesFinais}`;
    }

    const payload = {
      solicitante: {
        ...formDados,
        observacoes: observacoesFinais,
        filial_origem: estoqueAtual
      },
      itens: itensSelecionados,
      anexos: anexosProcessados,
    };

    try {
      const dados = await apiFetch("/solicitacoes/material", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (dados.sucesso || dados.ps || dados.ps_id) {
        const idGerado = dados.ps || dados.ps_id;

        showAlert("Operação Concluída!", `Sucesso! Solicitação criada com o ID: ${idGerado}`, "success");

        setFormDados({
          nome: "",
          wbs: "",
          destino: "",
          dataNecessidade: "",
          observacoes: "",
          entregaUrgente: false,
          justificativaUrgencia: "",
        });
        setItensSelecionados([]);
        setAnexos([]);
      } else {
        showAlert("Erro no Servidor", dados.erro || "Falha na comunicação com a API.", "error");
      }
    } catch (error) {
      console.error("Erro na requisição:", error.message);
      showAlert("Erro de Conexão", "Falha ao conectar com o servidor.", "error");
    }
  };

  const listaSegura = Array.isArray(itensSelecionados) ? itensSelecionados : [];

  return (
    <>
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone">
              <User size={18} />
            </div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>

        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME DO SOLICITANTE *</label>
            <input
              type="text"
              className="input-campo"
              placeholder="Seu nome completo"
              value={formDados.nome}
              onChange={(e) =>
                setFormDados({ ...formDados, nome: e.target.value })
              }
            />
          </div>
          <div className="input-grupo">
            <label>WBS / CENTRO DE CUSTO *</label>
            <input
              type="text"
              className="input-campo"
              placeholder="Ex: WBS-PRJ-2024-001"
              value={formDados.wbs}
              onChange={(e) =>
                setFormDados({ ...formDados, wbs: e.target.value })
              }
            />
          </div>
          <div className="input-grupo">
            <label>
              <MapPin size={14} /> FILIAL DE ORIGEM
            </label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" />
              <input
                type="text"
                className="input-campo"
                value={estoqueAtual}
                readOnly
              />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>
          <div className="input-grupo row-span-2">
            <label>
              <MapPin size={14} /> DESTINO *
            </label>
            <textarea
              className="input-campo"
              placeholder="Local de destino do material"
              value={formDados.destino}
              onChange={(e) =>
                setFormDados({ ...formDados, destino: e.target.value })
              }
            ></textarea>
          </div>
          <div className="input-grupo">
            <label>
              <Calendar size={14} /> DATA DE NECESSIDADE *
            </label>
            <input
              type="date"
              className="input-campo"
              value={formDados.dataNecessidade}
              min={dataMinima}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
              style={{ cursor: "pointer", width: "100%", boxSizing: "border-box" }}
              onChange={(e) =>
                setFormDados({ ...formDados, dataNecessidade: e.target.value })
              }
            />
          </div>
          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES GERAIS</label>
            <textarea
              className="input-campo"
              placeholder="Informações adicionais..."
              rows="2"
              value={formDados.observacoes}
              onChange={(e) =>
                setFormDados({ ...formDados, observacoes: e.target.value })
              }
            ></textarea>
          </div>
        </div>

        <GerenciadorAnexos anexos={anexos} setAnexos={setAnexos} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "16px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
            marginTop: "20px",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", width: "100%" }}>
            <input
              type="checkbox"
              id="checkbox-urgente"
              checked={formDados.entregaUrgente}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setFormDados({
                  ...formDados,
                  entregaUrgente: isChecked,
                  justificativaUrgencia: isChecked ? formDados.justificativaUrgencia : ""
                });
              }}
              style={{
                marginTop: "4px",
                cursor: "pointer",
                width: "16px",
                height: "16px",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={16} color={formDados.entregaUrgente ? "#ef4444" : "#475569"} />
                <label
                  htmlFor="checkbox-urgente"
                  style={{
                    fontWeight: "600",
                    color: formDados.entregaUrgente ? "#ef4444" : "#0f172a",
                    margin: 0,
                    cursor: "pointer",
                    transition: "color 0.2s ease"
                  }}
                >
                  Entrega Urgente / Atraso
                </label>
              </div>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#64748b",
                  marginTop: "4px",
                }}
              >
                Marcando esta opção, a solicitação entrará em fila de aprovação
                exclusiva do Administrador.
              </span>

              {formDados.entregaUrgente && (
                <div style={{ marginTop: "16px", width: "100%", animation: "fadeIn 0.3s ease" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#ef4444", marginBottom: "6px", display: "block" }}>
                    JUSTIFICATIVA DA URGÊNCIA *
                  </label>
                  <textarea
                    className="input-campo"
                    placeholder="Explique detalhadamente o motivo da urgência ou atraso no pedido..."
                    rows="2"
                    value={formDados.justificativaUrgencia}
                    onChange={(e) =>
                      setFormDados({ ...formDados, justificativaUrgencia: e.target.value })
                    }
                    style={{
                      borderColor: "#fca5a5",
                      backgroundColor: "#fef2f2"
                    }}
                  ></textarea>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <div
        className="selecao-itens-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "350px minmax(0, 1fr)",
          gap: "24px",
          marginTop: "24px",
          alignItems: "start"
        }}
      >
        <SeletorEstoqueLateral
          estoque={estoqueDisponivel}
          carregando={carregandoEstoque}
          onAdicionarItem={adicionarItemDoEstoque}
          itensSelecionados={listaSegura} // 👈 ADICIONAR ISTO!
        />

        <div
          className="painel-lista"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div
            className="painel-lista-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: "600",
                color: "#0f172a",
                fontSize: "1.1rem"
              }}
            >
              <Package size={20} color="#3b82f6" /> Itens Selecionados
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: '16px' }}>
                {listaSegura.length} / 25 itens
              </span>
            </div>
          </div>

          {listaSegura.length === 0 ? (
            <div
              className="estado-vazio-selecao"
              style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}
            >
              <Package
                size={48}
                strokeWidth={1}
                style={{
                  opacity: 0.3,
                  margin: "0 auto 16px auto",
                  display: "block",
                }}
              />
              <p>
                Clique nos itens do estoque à esquerda para adicioná-los à sua solicitação.
              </p>
            </div>
          ) : (
            <div
              className="scroll-tabela-solicitacao"
              style={{ overflowX: "auto" }}
            >
              <table
                className="tabela-solicitacao-dados"
                style={{
                  width: "100%",
                  minWidth: "1200px",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                    <th style={{ padding: "12px", width: "40px" }}></th>
                    <th style={{ padding: "12px", fontSize: "0.75rem", color: "#2563eb", fontWeight: "700" }}>DESENHO SAP</th>
                    <th style={{ padding: "12px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>PART NUMBER</th>
                    <th style={{ padding: "12px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>DESCRIÇÃO</th>
                    <th style={{ padding: "12px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>QTD</th>
                    <th style={{ padding: "12px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>NF ENTRADA</th>
                    <th style={{ padding: "12px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>ALOCAÇÃO</th>
                    <th style={{ padding: "12px", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>WBS</th>
                  </tr>
                </thead>
                <tbody>
                  {listaSegura.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ textAlign: "center", padding: "12px" }}>
                        <button
                          onClick={() => removerItem(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            transition: "color 0.2s"
                          }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>

                      <td style={{ backgroundColor: '#eff6ff', padding: "12px" }}>
                        <input
                          value={item.desenhoSAP || ""}
                          onChange={(e) =>
                            atualizarCampo(item.id, "desenhoSAP", e.target.value)
                          }
                          placeholder="SAP"
                          readOnly
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            backgroundColor: "transparent",
                            color: "#2563eb",
                            fontWeight: "700",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                          }}
                        />
                      </td>

                      <td style={{ padding: "12px" }}>
                        <input
                          value={item.numPecaFabricante || ""}
                          onChange={(e) =>
                            atualizarCampo(item.id, "numPecaFabricante", e.target.value)
                          }
                          placeholder="PN"
                          readOnly
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            fontWeight: "500",
                            color: "#1e293b",
                            backgroundColor: "transparent",
                            fontFamily: "monospace",
                            fontSize: "0.85rem"
                          }}
                        />
                      </td>

                      <td style={{ minWidth: "220px", padding: "12px" }}>
                        <input
                          value={item.materialDescription || ""}
                          onChange={(e) =>
                            atualizarCampo(item.id, "materialDescription", e.target.value)
                          }
                          placeholder="Descrição"
                          readOnly
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            color: "#475569",
                            backgroundColor: "transparent",
                            fontSize: "0.85rem",
                            textTransform: "uppercase"
                          }}
                        />
                      </td>

                      <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="number"
                            min="1"
                            max={item.qtdFornecida || ""}
                            value={item.qtdSelecionada !== undefined ? item.qtdSelecionada : 1}
                            onChange={(e) =>
                              atualizarCampo(item.id, "qtdSelecionada", e.target.value)
                            }
                            style={{
                              width: "60px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              outline: "none",
                              color: "#0f172a",
                              textAlign: "center"
                            }}
                          />
                          {item.qtdFornecida && (
                            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "500" }}>
                              / {item.qtdFornecida}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "12px" }}>
                        <input
                          value={item.nf || ""}
                          onChange={(e) =>
                            atualizarCampo(item.id, "nf", e.target.value)
                          }
                          placeholder="NF..."
                          readOnly
                          style={{
                            width: "130px",
                            border: "none",
                            outline: "none",
                            color: "#475569",
                            backgroundColor: "transparent",
                            fontSize: "0.75rem",
                            fontFamily: "monospace"
                          }}
                        />
                      </td>

                      <td style={{ padding: "12px" }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input
                            value={item.alocacao || ""}
                            onChange={(e) =>
                              atualizarCampo(item.id, "alocacao", e.target.value)
                            }
                            placeholder="Aloc..."
                            readOnly
                            style={{
                              width: "100%",
                              border: "none",
                              outline: "none",
                              color: "#2563eb",
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                              backgroundColor: "transparent"
                            }}
                          />
                          {item.isTransferencia && (
                            <span style={{ fontSize: '0.65rem', color: '#ca8a04', fontWeight: 'bold' }}>
                              *Transferido
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "12px" }}>
                        <input
                          value={item.wbs || ""}
                          onChange={(e) =>
                            atualizarCampo(item.id, "wbs", e.target.value)
                          }
                          placeholder="WBS..."
                          readOnly
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            color: "#64748b",
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            backgroundColor: "transparent"
                          }}
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

      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul" onClick={handleEnviar}>
          <Send size={16} /> Enviar Solicitação
        </button>
      </div>
    </>
  );
}