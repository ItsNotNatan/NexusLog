// =================================================================
// ARQUIVO: server.js
// DESCRICAO: Servidor de producao do NexusLog (Express + PocketBase + Socket.io)
//
// Sobe dois servicos no mesmo processo Node:
//   - API + WebSocket   -> PORT_API   (padrao 3002)
//   - Front (SPA React) -> PORT_FRONT (padrao 8083)
//
// O banco e' o PocketBase (porta 8092), iniciado pelo auto-deploy.
// As portas sao diferentes das do ATMLog (3001 / 8080 / 8082 / 8091),
// que roda na MESMA maquina - por isso nada pode colidir.
// =================================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const PORT_API = process.env.PORT_API || 3002;
const PORT_FRONT = process.env.PORT_FRONT || 8083;

// Importacao das Rotas da Aplicacao
const authRoutes = require('./src/routes/authRoutes');
const usuariosRoutes = require('./src/routes/usuariosRoutes');
const estoqueRoutes = require('./src/routes/estoqueRoutes');
const solicitacoesRoutes = require('./src/routes/solicitacoesRoutes');
const filiaisRoutes = require('./src/routes/filiaisRoutes');
const configuracoesRoutes = require('./src/routes/configuracoesRoutes');
const arquivosRoutes = require('./src/routes/arquivosRoutes');

const app = express();

// =================================================================
// 🌐 SERVIDOR HTTP + SOCKET.IO
// =================================================================
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🟢 [Frontend Conectado ao Radar] ID: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔴 [Frontend Desconectado] ID: ${socket.id}`);
  });
});

// =================================================================
// ⚡ EMISSAO AUTOMATICA DE EVENTOS (O RADAR)
// =================================================================
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const endpoint = req.originalUrl || req.path || '';

        // O upload de anexo nao mexe em nenhuma lista: nao avisa ninguem.
        if (endpoint.includes('/arquivos')) return;

        if (endpoint.includes('/estoque')) {
          console.log('\n📡 [SOCKET.IO] Alteração no Estoque!');
          io.emit('estoque_atualizado');
        } else if (
          endpoint.includes('/solicitacoes') ||
          endpoint.includes('/entrada') ||
          endpoint.includes('/material')
        ) {
          console.log('\n📡 [SOCKET.IO] Nova Solicitação ou Status alterado!');
          io.emit('solicitacoes_atualizadas');
        } else if (endpoint.includes('/filiais')) {
          console.log('\n📡 [SOCKET.IO] Filial adicionada/removida!');
          io.emit('filiais_atualizadas');
        } else if (endpoint.includes('/usuarios')) {
          console.log('\n📡 [SOCKET.IO] Utilizador alterado!');
          io.emit('usuarios_atualizados');
        } else if (endpoint.includes('/configuracoes')) {
          console.log('\n📡 [SOCKET.IO] Configuração (Target) alterada!');
          io.emit('configuracoes_atualizadas');
        }
      }
    });
  }
  next();
});

// =================================================================
// 🛡️ CORS E MIDDLEWARES
// =================================================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Limite alto: as telas de importacao mandam planilhas inteiras em JSON.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// =================================================================
// 🔗 ROTAS DA API
// =================================================================
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/solicitacoes', solicitacoesRoutes);
app.use('/api/filiais', filiaisRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/arquivos', arquivosRoutes);

app.get('/api/health', (req, res) =>
  res.json({ ok: true, servico: 'NexusLog API', hora: new Date().toISOString() })
);

app.get('/', (req, res) => {
  res.status(200).json({ sucesso: true, mensagem: '🚀 API NexusLog + PocketBase Online!' });
});

httpServer.listen(PORT_API, '0.0.0.0', () =>
  console.log(`🚀 API + WebSocket rodando na porta ${PORT_API}`)
);

// =================================================================
// 🌐 FRONT (SPA React buildado pelo Vite)
// =================================================================
function servirSPA(nome, pastaDist, porta) {
  const spa = express();
  spa.use(cors());

  const indexPath = path.join(pastaDist, 'index.html');

  if (!fs.existsSync(indexPath)) {
    spa.use((req, res) => {
      res.status(503).send(
        `<h2>${nome}: build nao encontrado</h2>` +
        '<p>Rode <code>npm run build</code> na raiz do repositorio. O resultado deve ficar em:</p>' +
        `<pre>${pastaDist}</pre>`
      );
    });
    spa.listen(porta, '0.0.0.0', () =>
      console.log(`⚠️  ${nome} na porta ${porta} (SEM build ainda - rode npm run build)`)
    );
    return;
  }

  spa.use(express.static(pastaDist));
  // Fallback do SPA: qualquer rota que nao seja arquivo devolve o index.html,
  // senao o React Router quebra ao recarregar a pagina (F5).
  spa.use((req, res) => res.sendFile(indexPath));
  spa.listen(porta, '0.0.0.0', () => console.log(`🌐 ${nome} rodando na porta ${porta}`));
}

// O Vite builda na raiz do repositorio; o Servidor fica um nivel abaixo.
servirSPA('NexusLog (front)', path.join(__dirname, '..', 'dist'), PORT_FRONT);
