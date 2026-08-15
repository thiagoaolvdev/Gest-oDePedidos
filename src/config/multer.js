const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const suffix = crypto.randomBytes(8).toString('hex');
    cb(null, `order_${req.params.id}_${Date.now()}_${suffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(ext)) {
    return cb(new Error('Formato inválido. Use: jpg, png, gif, webp'), false);
  }
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error('Tipo de arquivo inválido. Envie uma imagem válida'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') }
});

module.exports = upload;
