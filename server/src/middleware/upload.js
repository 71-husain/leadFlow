import multer from 'multer';
import HttpError from '../utils/HttpError.js';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(400, 'Only PDF, JPG or PNG files are allowed')),
}).single('file');