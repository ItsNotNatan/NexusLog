/* =====================================================================
   NEXUSLOG - AUTO-DEPLOY (vigia)
   - pb_data fica FORA do repositorio (nao e' apagado pelo git reset)
   - Backups automaticos + restauracao de backup + tecla de PAUSE
   - Sobe PocketBase + Servidor (que serve a API e o front)
   - Vigia o GitHub; commit novo -> fetch+reset -> rebuild do que mudou

   Estrutura esperada (o INICIAR-NEXUSLOG.bat roda ESTE arquivo):
     <pasta do deploy>\
       INICIAR-NEXUSLOG.bat
       auto-deploy.js        <- este arquivo (nivel bootstrap)
       NexusLog-Sistema\     <- repositorio clonado (CODIGO)
       pb_data\              <- O BANCO (fica aqui, fora do repo) *SEGURO*
       Backups\              <- backups automaticos e manuais

   Teclas: [R] reiniciar  [U] atualizar  [P] pausar/retomar  [B] backup  [Q] sair

   Portas: API 3002 | Front 8083 | PocketBase 8092
   O ATMLog roda na MESMA maquina usando 3001 / 8080 / 8082 / 8091,
   por isso nenhuma porta aqui pode coincidir com aquelas.
   ===================================================================== */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// __dirname = pasta do bootstrap (onde estao o .bat e este arquivo)
const BOOT = __dirname;
const ROOT = path.join(BOOT, 'NexusLog-Sistema'); // o repositorio (CODIGO)
const SERVIDOR = path.join(ROOT, 'Servidor');     // backend (API + PocketBase)
const FRONT = ROOT;                               // o Vite builda na raiz do repo
const PBDIR = path.join(SERVIDOR, 'pocketbase');
const PBEXE = path.join(PBDIR, 'pocketbase.exe');
const PB_MIGRATIONS = path.join(PBDIR, 'pb_migrations'); // schema (vem do repo)

// >>> O BANCO E OS BACKUPS FICAM FORA DO REPO (nenhum git toca aqui) <<<
const PB_DATA = path.join(BOOT, 'pb_data');
const BACKUPS = path.join(BOOT, 'Backups');

const PB_VERSION = '0.36.7';
const PB_PORT = 8092;
const PORT_API = 3002;
const PORT_FRONT = 8083;
const PORTS = [PORT_API, PORT_FRONT, PB_PORT];
const POLL_MS = 30000;
const BACKUP_MS = 6 * 60 * 60 * 1000; // backup automatico a cada 6 horas
const BACKUP_KEEP = 12;               // mantem os 12 backups mais recentes

// ----------------- logging -----------------
const ts = () => new Date().toLocaleTimeString('pt-BR');
const log = (m) => console.log(`\x1b[36m[${ts()}]\x1b[0m ${m}`);
const ok = (m) => console.log(`\x1b[32m[${ts()}] [OK]\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m[${ts()}] [!]\x1b[0m ${m}`);
const err = (m) => console.log(`\x1b[31m[${ts()}] [ERRO]\x1b[0m ${m}`);
const hr = () => console.log('\x1b[90m' + '='.repeat(66) + '\x1b[0m');

// ----------------- exec helpers -----------------
function shShell(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd: cwd || ROOT, stdio: 'inherit', shell: true }).status === 0;
}
function gitOut(args) {
  return (spawnSync('git', args, { cwd: ROOT, shell: true, encoding: 'utf8' }).stdout || '').trim();
}

// Mata SO os processos nas portas do NexusLog (nao encosta no ATMLog).
function killPort(port) {
  const out = (spawnSync('cmd', ['/c', `netstat -aon | findstr :${port} | findstr LISTENING`], { encoding: 'utf8' }).stdout || '');
  const pids = new Set();
  out.split(/\r?\n/).forEach((l) => { const p = l.trim().split(/\s+/).pop(); if (/^\d+$/.test(p)) pids.add(p); });
  pids.forEach((p) => { try { spawnSync('taskkill', ['/f', '/pid', p], { shell: true, stdio: 'ignore' }); } catch (e) {} });
}
function killExisting() { PORTS.forEach(killPort); }

// Alinha o clone ao remoto. O pb_data esta FORA do ROOT, entao isto
// NUNCA apaga o banco.
function syncRepo() {
  shShell('git', ['fetch', 'origin'], ROOT);
  shShell('git', ['reset', '--hard', 'origin/main'], ROOT);
}

// ----------------- processos longos (PB e servidor) -----------------
const procs = {};
function stopProc(name) {
  const p = procs[name];
  if (p && p.pid) { try { spawnSync('taskkill', ['/pid', String(p.pid), '/f', '/t'], { shell: true, stdio: 'ignore' }); } catch (e) {} }
  delete procs[name];
}
function startProc(name, exe, args, cwd, color) {
  stopProc(name);
  const p = spawn(exe, args, { cwd: cwd || ROOT });
  const tag = `\x1b[${color || 35}m[${name}]\x1b[0m`;
  p.stdout.on('data', (d) => String(d).split(/\r?\n/).forEach(l => l && console.log(`${tag} ${l}`)));
  p.stderr.on('data', (d) => String(d).split(/\r?\n/).forEach(l => l && console.log(`${tag} ${l}`)));
  p.on('exit', (code) => warn(`${name} encerrou (code ${code})`));
  procs[name] = p;
}

// ----------------- .env -----------------
function readEnv() {
  const f = path.join(SERVIDOR, '.env');
  const out = {};
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0 && !line.trim().startsWith('#')) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return out;
}
function setEnvVar(file, key, val) {
  let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let found = false;
  lines = lines.map((l) => { if (l.startsWith(key + '=')) { found = true; return key + '=' + val; } return l; });
  if (!found) lines.push(key + '=' + val);
  fs.writeFileSync(file, lines.join('\r\n'));
}
function ensureSecrets(file) {
  const env = readEnv();
  const fraco = (v) => !v || v.includes('defina') || v.includes('teste') || v.includes('TROQUE');
  if (fraco(env.JWT_SECRET)) setEnvVar(file, 'JWT_SECRET', require('crypto').randomBytes(48).toString('hex'));
}
function promptCredsIfNeeded(done) {
  const file = path.join(SERVIDOR, '.env');
  if (!fs.existsSync(file)) fs.copyFileSync(path.join(SERVIDOR, '.env.example'), file);
  ensureSecrets(file);
  const env = readEnv();
  if (env.PB_ADMIN_EMAIL && env.PB_ADMIN_PASSWORD && env.PB_ADMIN_PASSWORD.length >= 8 && !env.PB_ADMIN_PASSWORD.includes('TROQUE')) {
    ok(`.env ja configurado (admin do banco: ${env.PB_ADMIN_EMAIL})`);
    return done();
  }
  hr();
  console.log('\x1b[1m  CONFIGURACAO INICIAL - Conta de ADMINISTRADOR do banco (PocketBase)\x1b[0m');
  console.log('  (fica salvo so nesta maquina em Servidor\\.env - NAO vai pro GitHub)');
  hr();
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  const perguntar = () => rl.question('  E-mail do admin: ', (email) => {
    rl.question('  Senha (minimo 8 caracteres): ', (senha) => {
      email = (email || '').trim(); senha = (senha || '').trim();
      if (!email || senha.length < 8) { console.log('  \x1b[33m[!] E-mail vazio ou senha < 8. Tente de novo.\x1b[0m'); return perguntar(); }
      setEnvVar(file, 'PB_ADMIN_EMAIL', email);
      setEnvVar(file, 'PB_ADMIN_PASSWORD', senha);
      rl.close();
      ok('Credenciais salvas no .env (so nesta maquina).');
      done();
    });
  });
  perguntar();
}

// ----------------- BACKUP / RESTORE -----------------
function stamp() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function bancoTemDados(dir) { return fs.existsSync(path.join(dir || PB_DATA, 'data.db')); }
function listarBackups() {
  if (!fs.existsSync(BACKUPS)) return [];
  return fs.readdirSync(BACKUPS)
    .filter((n) => /^pb_backup_/i.test(n) && fs.statSync(path.join(BACKUPS, n)).isDirectory())
    .sort(); // nomes com timestamp -> ordem cronologica
}
function copiarPasta(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const nome of fs.readdirSync(src)) {
    const s = path.join(src, nome), d = path.join(dst, nome);
    if (fs.statSync(s).isDirectory()) copiarPasta(s, d);
    else fs.copyFileSync(s, d);
  }
}
function rotacionarBackups() {
  const dirs = listarBackups();
  while (dirs.length > BACKUP_KEEP) {
    const velho = dirs.shift();
    try { fs.rmSync(path.join(BACKUPS, velho), { recursive: true, force: true }); } catch (e) {}
  }
}
// Backup "a quente" (copia os arquivos do banco). Banco pequeno; o SQLite recupera pelo WAL.
function fazerBackup(motivo) {
  try {
    if (!bancoTemDados(PB_DATA)) return;
    fs.mkdirSync(BACKUPS, { recursive: true });
    const nome = `pb_backup_${stamp()}`;
    copiarPasta(PB_DATA, path.join(BACKUPS, nome));
    rotacionarBackups();
    ok(`Backup salvo em Backups\\${nome}${motivo ? '  (' + motivo + ')' : ''}`);
  } catch (e) { warn('Falha ao fazer backup: ' + e.message); }
}
function restaurarPara(srcDir) {
  fs.mkdirSync(PB_DATA, { recursive: true });
  for (const nome of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, nome), d = path.join(PB_DATA, nome);
    if (fs.statSync(s).isDirectory()) { fs.rmSync(d, { recursive: true, force: true }); copiarPasta(s, d); }
    else fs.copyFileSync(s, d);
  }
}
// Se o banco estiver vazio, oferece restaurar um backup antes de comecar do zero.
function restaurarSeNecessario(done) {
  if (bancoTemDados(PB_DATA)) return done(); // ja tem dados -> nao mexe e nao pergunta

  const backups = listarBackups();
  if (backups.length === 0) return done(); // nada pra restaurar -> o seed cria o basico

  hr();
  console.log('\x1b[1m  O banco esta VAZIO, mas existem backups guardados.\x1b[0m');
  console.log('  Escolha o que fazer:');
  console.log('    0) Comecar com um banco novo (o seed cria filiais e utilizadores de teste)');
  backups.slice(-9).forEach((n, i) => console.log(`    ${i + 1}) Restaurar ${n}`));
  hr();

  const opcoes = backups.slice(-9);
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  rl.question('  Opcao [0]: ', (resp) => {
    rl.close();
    const escolha = parseInt((resp || '0').trim(), 10);
    if (escolha >= 1 && escolha <= opcoes.length) {
      log(`Restaurando ${opcoes[escolha - 1]}...`);
      try { restaurarPara(path.join(BACKUPS, opcoes[escolha - 1])); ok('Backup restaurado.'); }
      catch (e) { err('Falha ao restaurar: ' + e.message); }
    } else {
      log('Comecando com um banco novo.');
    }
    done();
  });
}

// ----------------- preparacao -----------------
function ensurePocketBase() {
  if (fs.existsSync(PBEXE)) { ok('PocketBase encontrado'); return true; }
  log(`Baixando PocketBase v${PB_VERSION}...`);
  if (!fs.existsSync(PBDIR)) fs.mkdirSync(PBDIR, { recursive: true });
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_windows_amd64.zip`;
  const zip = path.join(require('os').tmpdir(), 'pbnexus.zip');
  const ps = `[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${url}' -OutFile '${zip}'; Expand-Archive -Path '${zip}' -DestinationPath '${PBDIR}' -Force`;
  spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
  if (fs.existsSync(PBEXE)) { ok('PocketBase baixado'); return true; }
  err('Falha ao baixar o PocketBase (verifique a internet).'); return false;
}

function npmInstallIfNeeded(dir, nome) {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    log(`Instalando dependencias do ${nome} (npm install)...`);
    if (!shShell('npm', ['install', '--no-audit', '--no-fund'], dir)) { err(`npm install do ${nome} falhou`); return false; }
  }
  ok(`dependencias do ${nome} prontas`);
  return true;
}

function buildFront() {
  log('Buildando o front (npm run build)...');
  if (!shShell('npm', ['run', 'build'], FRONT)) { err('build do front falhou'); return false; }
  ok('front buildado');
  return true;
}

function ensureSuperuser() {
  const env = readEnv();
  const email = env.PB_ADMIN_EMAIL || 'admin@nexuslog.local';
  const pass = env.PB_ADMIN_PASSWORD || 'ChangeMe_NexusLog_2026';
  let r = spawnSync(PBEXE, ['superuser', 'upsert', email, pass, `--dir=${PB_DATA}`], { cwd: PBDIR, encoding: 'utf8' });
  if (r.status !== 0) spawnSync(PBEXE, ['superuser', 'create', email, pass, `--dir=${PB_DATA}`], { cwd: PBDIR, encoding: 'utf8' });
  ok(`superuser do banco: ${email}`);
}

function waitForPB(cb, tries = 0) {
  http.get(`http://127.0.0.1:${PB_PORT}/api/health`, () => cb(true)).on('error', () => {
    if (tries > 20) return cb(false);
    setTimeout(() => waitForPB(cb, tries + 1), 1000);
  });
}

function runSeed(cb) {
  log('Populando o banco (seed idempotente - so cria o que falta)...');
  const p = spawn(process.execPath, [path.join(SERVIDOR, 'seed.js')], { cwd: SERVIDOR });
  p.stdout.on('data', d => process.stdout.write(`  \x1b[34m[seed]\x1b[0m ${d}`));
  p.stderr.on('data', d => process.stdout.write(`  \x1b[34m[seed]\x1b[0m ${d}`));
  p.on('exit', () => cb());
}

function startServidor() {
  startProc('servidor', process.execPath, [path.join(SERVIDOR, 'server.js')], SERVIDOR, 32);
}
function startPocketBase() {
  // --dir aponta o banco pra FORA do repo; --migrationsDir usa o schema do repo.
  startProc('pocketbase', PBEXE, ['serve', `--http=0.0.0.0:${PB_PORT}`, `--dir=${PB_DATA}`, `--migrationsDir=${PB_MIGRATIONS}`], PBDIR, 33);
}

function localIP() {
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) for (const n of nets[name]) if (n.family === 'IPv4' && !n.internal) return n.address;
  return 'localhost';
}
function bannerPronto() {
  const ip = localIP();
  hr();
  console.log('\x1b[1m\x1b[32m   NEXUSLOG NO AR\x1b[0m');
  console.log(`   Sistema     : http://${ip}:${PORT_FRONT}`);
  console.log(`   API         : http://${ip}:${PORT_API}/api/health`);
  console.log(`   PocketBase  : http://${ip}:${PB_PORT}/_/`);
  console.log(`   Banco       : ${PB_DATA}`);
  console.log(`   Backups     : ${BACKUPS}`);
  console.log('');
  console.log('   Login inicial: adm@comau.com / 123');
  hr();
  log(`Vigiando o GitHub a cada ${POLL_MS / 1000}s | Backup automatico a cada ${BACKUP_MS / 3600000}h`);
  mostrarControles();
}

// ----------------- controles de teclado -----------------
function mostrarControles() {
  console.log('\x1b[1m\x1b[33m  >>> [R]=reiniciar  [U]=atualizar  [P]=pausar/retomar  [B]=backup agora  [Q]=parar e sair  [H]=ajuda <<<\x1b[0m');
  console.log('\x1b[90m      (use Q para parar - no Windows o Ctrl+C nem sempre encerra os processos)\x1b[0m');
}
function pararTudo() {
  console.log('');
  log('Fazendo backup final e parando tudo...');
  fazerBackup('ao sair');
  stopProc('servidor'); stopProc('pocketbase');
  killExisting();
  ok('Tudo encerrado. Ate logo!');
  process.exit(0);
}
function reiniciar() {
  if (pausado) { warn('Sistema pausado - aperte P para retomar.'); return; }
  log('Reiniciando os servidores...');
  killExisting();
  startPocketBase();
  waitForPB(() => { startServidor(); setTimeout(() => { ok('Reiniciado.'); mostrarControles(); }, 1500); });
}

// ----------------- PAUSE -----------------
let pausado = false;
function pausarOuRetomar() {
  if (!pausado) {
    log('PAUSANDO o NexusLog (PocketBase + Servidor)...');
    fazerBackup('antes de pausar');
    stopProc('servidor'); stopProc('pocketbase');
    killExisting();
    pausado = true;
    console.log('\x1b[1m\x1b[33m  >>> SISTEMA PAUSADO - aperte [P] para retomar  |  [Q] para sair <<<\x1b[0m');
  } else {
    log('Retomando o NexusLog...');
    startPocketBase();
    waitForPB(() => { startServidor(); setTimeout(() => { pausado = false; ok('Sistema retomado.'); mostrarControles(); }, 1500); });
  }
}

function setupControls() {
  if (!process.stdin.isTTY) return;
  process.stdin.removeAllListeners('data');
  try { process.stdin.setRawMode(true); } catch (e) {}
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key) => {
    const k = (key || '').toLowerCase();
    if (k === 'q' || (key && key.charCodeAt(0) === 3)) return pararTudo();
    if (k === 'p') return pausarOuRetomar();
    if (k === 'b') { log('Fazendo backup manual...'); return fazerBackup('manual'); }
    if (k === 'r') return reiniciar();
    if (k === 'u') { if (pausado) { warn('Sistema pausado.'); return; } log('Verificando atualizacao agora...'); return verificarAtualizacao(); }
    if (k === 'h') return mostrarControles();
  });
}

// ----------------- ciclo de atualizacao -----------------
let atualizando = false;
function verificarAtualizacao() {
  if (atualizando || pausado) return;
  const local = gitOut(['rev-parse', 'HEAD']);
  const remoto = (gitOut(['ls-remote', 'origin', 'HEAD']).split(/\s+/)[0]) || '';
  if (!remoto || remoto === local) return;

  atualizando = true;
  hr();
  log(`\x1b[1mNovo commit detectado!\x1b[0m  ${local.slice(0, 7)} -> ${remoto.slice(0, 7)}`);
  fazerBackup('antes de atualizar');
  log('Baixando alteracoes (git fetch + reset --hard)...');
  shShell('git', ['fetch', 'origin'], ROOT);
  if (!shShell('git', ['reset', '--hard', 'origin/main'], ROOT)) { err('git reset falhou'); atualizando = false; return; }

  const mudou = gitOut(['diff', '--name-only', local, 'HEAD']).split(/\r?\n/).filter(Boolean);
  const tocou = (pref) => mudou.some(f => f.startsWith(pref));
  log('Arquivos alterados:'); mudou.slice(0, 20).forEach(f => console.log('   ~ ' + f));

  // Backend
  if (tocou('Servidor/package')) shShell('npm', ['install', '--no-audit', '--no-fund'], SERVIDOR);

  // Front: qualquer coisa fora da pasta Servidor/ e Deploy/ pode afetar o build
  const mexeuNoFront = mudou.some(f =>
    f.startsWith('src/') || f.startsWith('public/') ||
    f === 'index.html' || f === 'package.json' || f === 'vite.config.js'
  );
  if (mexeuNoFront) {
    if (mudou.includes('package.json')) shShell('npm', ['install', '--no-audit', '--no-fund'], FRONT);
    buildFront();
  }

  const finalizar = () => {
    if (tocou('Servidor/')) { log('Reiniciando o servidor...'); startServidor(); }
    ok('Atualizacao aplicada.');
    hr(); mostrarControles();
    atualizando = false;
  };

  if (tocou('Servidor/pocketbase/pb_migrations')) {
    log('Migrations mudaram - reiniciando o PocketBase e re-seedando...');
    startPocketBase();
    waitForPB((up) => { if (!up) warn('PocketBase demorou a responder.'); ensureSuperuser(); runSeed(finalizar); });
  } else {
    finalizar();
  }
}

// ----------------- main -----------------
function main() {
  hr();
  console.log('\x1b[1m  NEXUSLOG - AUTO-DEPLOY  (banco a prova de restart)\x1b[0m');
  hr();

  log('Encerrando instancias antigas e liberando as portas do NexusLog...');
  killExisting();
  log('Sincronizando o CODIGO com o GitHub (o banco fica fora, nao e tocado)...');
  syncRepo();

  if (!ensurePocketBase()) process.exit(1);

  promptCredsIfNeeded(() => {
    if (!npmInstallIfNeeded(SERVIDOR, 'Servidor')) process.exit(1);
    npmInstallIfNeeded(FRONT, 'Front');

    // Se o banco (externo) estiver vazio, oferece restaurar um backup.
    restaurarSeNecessario(() => {
      ensureSuperuser();

      if (!fs.existsSync(path.join(FRONT, 'dist', 'index.html'))) buildFront();

      log(`Iniciando PocketBase (porta ${PB_PORT}, dados em ${PB_DATA})...`);
      startPocketBase();
      waitForPB((up) => {
        if (up) ok('PocketBase rodando'); else warn('PocketBase nao respondeu a tempo (seguindo mesmo assim).');
        runSeed(() => {
          log(`Iniciando o Servidor (API ${PORT_API} + front ${PORT_FRONT})...`);
          startServidor();
          setTimeout(bannerPronto, 2500);
          setTimeout(() => fazerBackup('inicial'), 90000);  // 1 backup ~1min apos subir
          setInterval(() => { if (!pausado) fazerBackup('automatico'); }, BACKUP_MS);
          setInterval(verificarAtualizacao, POLL_MS);
          setupControls();
        });
      });
    });
  });
}

process.on('SIGINT', () => pararTudo());
main();
