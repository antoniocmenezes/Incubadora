import multer from 'multer';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${ts}__${safe}`);
  }
});

function fileFilter(_req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
  if (!allowed.includes(file.mimetype)) return cb(new Error('Formato de imagem inválido'));
  cb(null, true);
}

export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024 } // 4MB
}).single('logo');
