import fs from 'fs/promises';
import path from 'path';
import { FILE_UPLOAD_PATH } from '../config/otaConfig';

export class OTA {
  private static readonly UPLOAD_PATH = path.resolve(__dirname, FILE_UPLOAD_PATH);

  public async saveFile(file: Express.Multer.File): Promise<void> {
    const filePath = path.join(OTA.UPLOAD_PATH, file.originalname);
    try {
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      throw new Error('Failed to save the file');
    }
  }
}