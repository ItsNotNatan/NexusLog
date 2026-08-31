// =================================================================
// ARQUIVO: seed.js
// DESCRICAO: Popula o banco com os dados iniciais do NexusLog.
//
// Os dados sao os mesmos do BancoDeDados.txt (o DDL do Postgres) que esta
// na raiz do repositorio: o target de eficiencia, as tres filiais e os
// utilizadores de teste.
//
// E IDEMPOTENTE: roda a cada arranque e so cria o que ainda nao existe.
// Nada e' sobrescrito - se o Natan trocar a senha do adm, ela fica.
// =================================================================
require('dotenv').config();
const db = require('./src/db');

const FILIAIS = [
  { codigo: 'BR02', nome: 'BR02 — Santo André', cidade: 'Santo André, SP' },
  { codigo: 'BR04', nome: 'BR04 — Goiana', cidade: 'Goiana, PE' },
  { codigo: 'BR06', nome: 'BR06 — Betim', cidade: 'Betim, MG' },
];

const USUARIOS = [
  {
    email: 'adm@comau.com', senha: '123', nome_completo: 'Douglas Felipe (ADM)',
    cargo: 'ADM', filial_padrao_id: 'BR04', filiais_acesso: ['BR02', 'BR04', 'BR06'],
  },
  {
    email: 'lider@comau.com', senha: '123', nome_completo: 'Jeferson Garandy (Líder)',
    cargo: 'LIDER', filial_padrao_id: 'BR06', filiais_acesso: ['BR06', 'BR02'],
  },
  {
    email: 'operador@comau.com', senha: '123', nome_completo: 'Marcio (Operador)',
    cargo: 'OPERADOR', filial_padrao_id: 'BR02', filiais_acesso: ['BR02'],
  },
];

async function semear() {
  let criados = 0;

  // ---- Configuracao: target de eficiencia (padrao 3 dias) ----
  const target = await db.um('configuracoes', db.f('chave = {:c}', { c: 'target_eficiencia' }));
  if (!target) {
    await db.criar('configuracoes', { chave: 'target_eficiencia', valor: '3' });
    console.log('  + configuracao "target_eficiencia" = 3');
    criados++;
  }

  // ---- Filiais ----
  for (const filial of FILIAIS) {
    const existe = await db.um('filiais', db.f('codigo = {:c}', { c: filial.codigo }));
    if (!existe) {
      await db.criar('filiais', filial);
      console.log(`  + filial ${filial.codigo}`);
      criados++;
    }
  }

  // ---- Utilizadores de teste ----
  for (const usuario of USUARIOS) {
    const existe = await db.um('usuarios', db.f('email = {:e}', { e: usuario.email }));
    if (!existe) {
      await db.criar('usuarios', usuario);
      console.log(`  + utilizador ${usuario.email} (${usuario.cargo})`);
      criados++;
    }
  }

  if (criados === 0) console.log('  banco ja populado - nada a fazer.');
  else console.log(`  ${criados} registo(s) criado(s).`);
}

semear()
  .then(() => {
    console.log('✅ Seed concluido.');
    process.exit(0);
  })
  .catch((erro) => {
    console.error('❌ Falha no seed:', erro.message);
    // Nao derruba o deploy: o sistema sobe e o erro fica visivel no log.
    process.exit(0);
  });
