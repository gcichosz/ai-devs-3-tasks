import axios from 'axios';

import { AppError } from '../../errors';

export class SendRequestSkill {
  async postRequest(url: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const response = await axios.post(url, JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.log(error);
      throw new AppError('Failed to send POST request', { error });
    }
  }

  async getRequest(url: string): Promise<string | Record<string, unknown>> {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.log(error);
      throw new AppError('Failed to send GET request', { error });
    }
  }

  async downloadFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}
