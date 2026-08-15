const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };

class Logger {
  constructor(level = 'DEBUG') {
    this.level = levels[level] !== undefined ? levels[level] : levels.DEBUG;
  }

  _redact(value) {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(item => this._redact(item));
    const clone = {};
    for (const [key, item] of Object.entries(value)) {
      if (['senha', 'password', 'token', 'refreshToken', 'refresh_token', 'authorization'].includes(String(key).toLowerCase())) {
        clone[key] = '[REDACTED]';
      } else if (item && typeof item === 'object') {
        clone[key] = this._redact(item);
      } else {
        clone[key] = item;
      }
    }
    return clone;
  }

  _log(level, message, data = null) {
    if (levels[level] > this.level) return;
    const timestamp = new Date().toISOString();
    const safeData = data ? this._redact(data) : null;
    const logLine = `[${timestamp}] [${level}] ${message}${safeData ? ' | ' + JSON.stringify(safeData) : ''}\n`;
    console.log(logLine.trim());
    this._writeToFile(level, logLine);
  }

  _writeToFile(level, line) {
    const date = new Date().toISOString().slice(0, 10);
    const filePath = path.join(logDir, `${date}.log`);
    fs.promises.appendFile(filePath, line, 'utf8').catch(() => {});
  }

  error(message, data) { this._log('ERROR', message, data); }
  warn(message, data) { this._log('WARN', message, data); }
  info(message, data) { this._log('INFO', message, data); }
  debug(message, data) { this._log('DEBUG', message, data); }
}

module.exports = new Logger(process.env.LOG_LEVEL);
