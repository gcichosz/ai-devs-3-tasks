import { v4 as uuid } from 'uuid';

import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { Document } from './types';

export class IdentifyPeopleService {
  constructor(private readonly sendRequestSkill: SendRequestSkill) {}

  async identify(names: string[]): Promise<Document[]> {
    console.log('🕵️ Identifying people:', names);
    const response = await this.sendRequestSkill.postRequest('https://centrala.ag3nts.org/apidb', {
      task: 'database',
      apikey: process.env.AI_DEVS_API_KEY,
      query: `SELECT id, username FROM users WHERE username IN (${names.map((name) => `"${name}"`).join(',')})`,
    });

    console.log('🕵️ Identify people response:', response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response.reply as any[]).map((user: { id: string; username: string }) => ({
      uuid: uuid(),
      text: `${user.username} id is ${user.id}`,
      metadata: {
        name: `translate_names_to_ids for ${user.username}`,
      },
    }));
  }
}
