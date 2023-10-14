import { Express, Router } from 'express';
import multer from 'multer';
import { uploadOTAFile } from '../ota/controllers/otaControllers';

const OTARoutes = (app: Express) => {
  const router = Router();

  const upload = multer({ storage: multer.memoryStorage() });

  router.post('/upload', upload.single('file'), uploadOTAFile);

  app.use('/ota', router);
};

export default OTARoutes;