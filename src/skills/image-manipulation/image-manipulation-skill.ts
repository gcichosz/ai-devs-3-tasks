import { promises as fs } from 'fs';
import sharp from 'sharp';

export class ImageManipulationSkill {
  async prepareImage(filePath: string): Promise<string> {
    const imageBuffer = await fs.readFile(filePath);
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(2048, 2048, { fit: 'inside' })
      .png({ compressionLevel: 5 })
      .toBuffer();
    return resizedImageBuffer.toString('base64');
  }
}
