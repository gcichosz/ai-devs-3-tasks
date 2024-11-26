import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';

interface ChatMessages {
  messages: {
    role: string;
    content: string;
  }[];
}

const readFile = async (filename: string) => {
  const fileData = await fs.readFile('./src/research/lab_data/' + filename, 'utf-8');
  return fileData.split('\n').filter((line) => line.length > 0);
};

const translateToFineTuningMessages = (data: string[], label: string) => {
  return data.map((line) => ({
    messages: [
      {
        role: 'system',
        content: 'Verify data',
      },
      {
        role: 'user',
        content: line,
      },
      {
        role: 'assistant',
        content: label,
      },
    ],
  }));
};

const saveMessages = async (messages: ChatMessages[]) => {
  await fs.writeFile(`./src/research/training-data.jsonl`, messages.map((msg) => JSON.stringify(msg)).join('\n'));
};

const main = async () => {
  const trainingMessages: ChatMessages[] = [];

  await Promise.all(
    ['incorrect', 'correct'].map(async (label) => {
      const fileData = await readFile(`${label}.txt`);
      console.log(JSON.stringify(fileData, null, 2));

      const messages = translateToFineTuningMessages(fileData, label);
      console.log(JSON.stringify(messages, null, 2));

      trainingMessages.push(...messages);
    }),
  );

  await saveMessages(trainingMessages);

  const verifyData = await readFile('verify.txt');
  console.log(verifyData);

  const data = verifyData.map((line) => ({
    id: line.split('=')[0],
    content: line.split('=')[1],
  }));

  console.log(data);

  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const correctData = [];
  for (const item of data) {
    const response = await openAiSkill.completionFull(
      [
        { role: 'system', content: 'Verify data' },
        { role: 'user', content: item.content },
      ],
      'ft:gpt-4o-mini-2024-07-18:grzegorz-cichosz::AXvmIrQ9',
    );
    console.log(response.choices[0].message.content);

    if (response.choices[0].message.content === 'correct') {
      correctData.push(item.id);
    }
  }

  const sendRequestSkill = new SendRequestSkill();
  const reportResult = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'research',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: correctData,
  });
  console.log(reportResult);
};

main();
