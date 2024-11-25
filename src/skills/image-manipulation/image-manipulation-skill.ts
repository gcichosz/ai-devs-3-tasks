import { promises as fs } from 'fs';
import sharp from 'sharp';

export class ImageManipulationSkill {
  async prepareImageFromPath(filePath: string): Promise<string> {
    const imageBuffer = await fs.readFile(filePath);
    return this.prepareImageFromBuffer(imageBuffer);
  }

  async prepareImageFromBuffer(imageBuffer: Buffer): Promise<string> {
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(2048, 2048, { fit: 'inside' })
      .png({ compressionLevel: 5 })
      .toBuffer();
    return resizedImageBuffer.toString('base64');
  }

  async saveImageFromBuffer(imageBuffer: Buffer, filePath: string): Promise<void> {
    await sharp(imageBuffer).resize(2048, 2048, { fit: 'inside' }).png({ compressionLevel: 5 }).toFile(filePath);
  }
}
