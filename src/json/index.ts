import { promises as fs } from 'fs';

type TestData = {
  question: string;
  answer: number;
  test?: {
    q: string;
    a: string;
  };
};

type CalibrationData = {
  apikey: string;
  description: string;
  copyright: string;
  'test-data': TestData[];
};

const loadJson = async (filePath: string): Promise<CalibrationData> => {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(fileContent);
};

// TODO: Calculate number of tokens in test-data
// TODO: Split test data in parts based on number of tokens
// TODO: Send test data parts to LLM to fix it
// TODO: Combine fixed test data parts
// TODO: Replace API key placeholder with actual API key
// TODO: Send fixed test data to API

const main = async () => {
  const jsonData = await loadJson('./src/json/json.txt');
  console.log(jsonData['test-data'].length);
};

main();
