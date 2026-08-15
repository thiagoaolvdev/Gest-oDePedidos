const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RESTART_DIR = path.join(ROOT, 'tmp');
const RESTART_FILE = path.join(RESTART_DIR, 'restart.txt');
const POLL_INTERVAL = 3000;
const IGNORED_DIRS = new Set(['node_modules', 'tmp', 'logs', 'database', 'public', 'uploads', 'Fotos', '.git']);
const EXTRA_FILES = ['server.js', 'app.js', 'package.json', 'package-lock.json'];

let lastSignature = null;

function computeSignature() {
  let latest = 0;
  let count = 0;

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        try {
          const st = fs.statSync(full);
          count += 1;
          if (st.mtimeMs > latest) latest = st.mtimeMs;
        } catch (err) {
          // arquivo removido durante a leitura; ignora
        }
      }
    }
  };

  walk(path.join(ROOT, 'src'));

  for (const file of EXTRA_FILES) {
    try {
      const st = fs.statSync(path.join(ROOT, file));
      count += 1;
      if (st.mtimeMs > latest) latest = st.mtimeMs;
    } catch (err) {
      // arquivo inexistente; ignora
    }
  }

  return `${count}_${latest}`;
}

function requestRestart() {
  try {
    if (!fs.existsSync(RESTART_DIR)) fs.mkdirSync(RESTART_DIR, { recursive: true });
    fs.writeFileSync(RESTART_FILE, `Restart solicitado automaticamente em ${new Date().toISOString()}\n`);
    console.log('Arquivos do backend alterados. Restart automatico enviado ao Passenger.');
  } catch (err) {
    console.error('Falha ao solicitar restart:', err.message);
  }
}

function start() {
  try {
    lastSignature = computeSignature();
    setInterval(() => {
      const current = computeSignature();
      if (current !== lastSignature) {
        lastSignature = current;
        requestRestart();
      }
    }, POLL_INTERVAL);
    console.log('Auto-restart ativo: mudancas no codigo reiniciam o app sozinho.');
  } catch (err) {
    console.error('Falha ao iniciar o auto-restart:', err.message);
  }
}

module.exports = { start };
