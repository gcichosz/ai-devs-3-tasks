import { v4 as uuid } from 'uuid';

import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { Document } from './types';

export class ScanLocationService {
  constructor(private readonly sendRequestSkill: SendRequestSkill) {}

  async scan(query: string): Promise<Document> {
    console.log('🌍 Scanning location:', query);
    const response = await this.sendRequestSkill.postRequest('https://centrala.ag3nts.org/places', {
      apikey: process.env.AI_DEVS_API_KEY,
      query,
    });

    console.log('🌍 Scan location response:', response);

    return {
      uuid: uuid(),
      text: response.message as string,
      metadata: {
        name: `scan_location for ${query}`,
      },
    };
  }
}
