import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { Document } from './types';

// Min
// TODO: Identify speakers in each conversation
// TODO: Fetch phone_questions.json containing questions
// TODO: Load facts data from previous tasks

// TODO: Create function to extract facts stated by each speaker
// TODO: Cross-reference facts with known facts from previous tasks
// TODO: Identify the liar by finding contradictions
// TODO: Filter out false information

// TODO: Create function to process each question
// TODO: Implement logic for conversation content questions
// TODO: Implement logic for speaker-related questions
// TODO: Implement logic for API-dependent questions
// TODO: Implement logic for fact-based questions

// TODO: Create function for API communication
// TODO: Implement API response processing
// TODO: Integrate API responses into answers

// TODO: Create answer formatting function according to required structure
// TODO: Create function to submit answers to centrala
// TODO: Handle response and extract flag

// Max
// TODO: Create function to reconstruct conversations based on start/end sentences
// TODO: Map each piece of conversation to its proper place

const getConversations = async (sendRequestSkill: SendRequestSkill): Promise<Document[]> => {
  const cachedDocuments = await fs.readdir('./src/phone/conversations');
  if (cachedDocuments.length) {
    const cachedDocumentsContent = await Promise.all(
      cachedDocuments.map(async (document) => await fs.readFile(`./src/phone/conversations/${document}`, 'utf-8')),
    );
    return cachedDocumentsContent.map((document) => JSON.parse(document));
  }

  const conversationsResponse = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/phone_sorted.json`,
  );
  const conversationDocuments = Object.entries(conversationsResponse).map(([id, sentences]) => ({
    uuid: uuid(),
    text: (sentences as string[]).join('\n'),
    metadata: {
      name: id,
    },
  })) as Document[];

  await Promise.all(
    conversationDocuments.map(async (document) =>
      fs.writeFile(`./src/phone/conversations/${document.uuid}.json`, JSON.stringify(document)),
    ),
  );

  return conversationDocuments;
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  const anonymousConversations = await getConversations(sendRequestSkill);
  console.log(anonymousConversations);
};

main();
