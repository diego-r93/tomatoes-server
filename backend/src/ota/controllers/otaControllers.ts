import { Request, Response } from 'express';
import { OTA } from '../models/otaModels';

export const uploadOTAFile = async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send({ error: 'No file uploaded' });
  }

  const ota = new OTA();
  try {
    await ota.saveFile(file);
    res.send({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    res.status(500).send({ error: errorMessage });
  }
};