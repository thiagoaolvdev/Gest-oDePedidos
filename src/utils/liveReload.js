const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const IGNORED_DIRS = new Set(['node_modules', 'tmp', 'logs', 'database', 'uploads', 'Fotos', '.git']);
const SCAN_DIRS = ['src', 'public'];

const BOOT = Date.now();
const SCAN_TTL = 1500;

let cachedState = null;
let lastScan = 0;

function scan() {
  let latest = 0;
  let size = 0;
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
          size += st.size;
          if (st.mtimeMs > latest) latest = st.mtimeMs;
        } catch (err) {
          // arquivo removido durante a leitura; ignora
        }
      }
    }
  };

  for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir));
  return `${BOOT}_${latest}_${size}_${count}`;
}

function state() {
  const now = Date.now();
  if (now - lastScan >= SCAN_TTL) {
    cachedState = scan();
    lastScan = now;
  }
  return cachedState;
}

const CLIENT_SCRIPT = `(function(){var s=null;function p(){fetch('/__reload-state',{cache:'no-store'}).then(function(r){return r.json()}).then(function(d){if(s===null){s=d.state;return}if(d.state!==s){location.reload()}}).catch(function(){})}p();setInterval(p,2000)})();`;

function inject(html) {
  const script = `<script>${CLIENT_SCRIPT}</script>`;
  if (html.indexOf('</body>') !== -1) {
    return html.replace('</body>', `${script}</body>`);
  }
  return `${html}${script}`;
}

function stateHandler(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ state: state() });
}

function injector() {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const accept = req.headers.accept || '';
    const isHtml = req.path.endsWith('.html') || accept.includes('text/html');
    if (!isHtml) return next();

    const originalSend = res.send.bind(res);

    res.send = function (body) {
      if (typeof body === 'string' && body.indexOf('</body>') !== -1) {
        body = inject(body);
        this.set('Content-Type', 'text/html; charset=utf-8');
      }
      return originalSend(body);
    };

    const originalSendFile = res.sendFile.bind(res);

    res.sendFile = function (filePath, options, callback) {
      if (typeof filePath === 'string' && filePath.toLowerCase().endsWith('.html')) {
        return fs.readFile(filePath, (err, data) => {
          if (err) return originalSendFile(filePath, options, callback);
          const html = inject(data.toString('utf8'));
          this.set('Content-Type', 'text/html; charset=utf-8');
          if (typeof callback === 'function') callback(null);
          return originalSend(html);
        });
      }
      return originalSendFile(filePath, options, callback);
    };

    return next();
  };
}

module.exports = { stateHandler, injector };
