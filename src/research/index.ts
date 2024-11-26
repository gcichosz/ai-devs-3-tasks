import { promises as fs } from 'fs';

// TODO: Fine-tune model
// TODO: Verify data with a fine-tuned model
// TODO: Report results

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
};

main();
