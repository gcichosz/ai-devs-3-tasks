import { promises as fs } from 'fs';

// TODO: Convert correct data to fine-tuning JSONL
// TODO: Combine fine-tuning data
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

const saveMessages = async (messages: ChatMessages[], label: string) => {
  await fs.writeFile(`./src/research/${label}.jsonl`, messages.map((msg) => JSON.stringify(msg)).join('\n'));
};

const main = async () => {
  const incorrectData = await readFile('incorrect.txt');
  console.log(JSON.stringify(incorrectData, null, 2));

  const incorrectMessages = translateToFineTuningMessages(incorrectData, 'incorrect');
  console.log(JSON.stringify(incorrectMessages, null, 2));

  await saveMessages(incorrectMessages, 'incorrect');
};

main();
