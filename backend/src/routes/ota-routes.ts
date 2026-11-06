import { Express, Router } from 'express';
import multer from 'multer';
import { firmwareKey, MAX_FIRMWARE_BYTES, uploadOTAFile } from '../ota/controllers/otaControllers';
import { authenticate, context, endpoint, rateLimit, requireAdmin } from '../users/http';

export default function setupOta(app: Express) {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FIRMWARE_BYTES + 1, files: 1, fields: 0 } });
  router.post('/:host/firmware', authenticate, requireAdmin,
    rateLimit(5, 10 * 60000, (_req, res) => String(context(res).user.id)),
    (_req, _res, next) => {
      try { firmwareKey(); next(); } catch (error) { next(error); }
    },
    (req, res, next) => upload.single('file')(req, res, error => {
      if (error) {
        res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'Invalid firmware upload or file size exceeds 6,553,600 bytes.' });
        return;
      }
      next();
    }),
    endpoint(uploadOTAFile));
  app.use('/ota', router);
}
