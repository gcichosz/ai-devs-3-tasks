import { v4 as uuid } from 'uuid';

import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { Document } from './types';

export class LocatePeopleService {
  constructor(private readonly sendRequestSkill: SendRequestSkill) {}

  async locate(personIds: string[]): Promise<Document[]> {
    console.log('📍 Locating people:', personIds);

    return Promise.all(
      personIds.map(async (personId) => {
        const response = await this.sendRequestSkill.postRequest('https://centrala.ag3nts.org/gps', {
          apikey: process.env.AI_DEVS_API_KEY,
          userID: personId,
        });
        console.log('📍 Locate person response:', response);
        return {
          uuid: uuid(),
          text: `Person with id ${personId} is at ${JSON.stringify(response)}`,
          metadata: {
            name: `get_coordinates for ${personId}`,
          },
        };
      }),
    );
  }
}
