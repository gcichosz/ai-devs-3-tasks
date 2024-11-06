import { promises as fs } from 'fs';

import { TokenizerSkill } from '../skills/tokenizer';

const Gpt4oMiniOutputTokens = 16000;

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

const calculateTokens = async (data: TestData[]): Promise<number> => {
  const tokenizer = new TokenizerSkill();
  const jsonString = JSON.stringify(data);
  return await tokenizer.countTokens(jsonString, 'gpt-4o');
};

const splitTestData = (tokenCount: number, jsonData: CalibrationData): TestData[][] => {
  const numberOfParts = Math.ceil(tokenCount / Gpt4oMiniOutputTokens);
  const partSize = Math.ceil(jsonData['test-data'].length / numberOfParts);
  const parts = [];
  for (let i = 0; i < numberOfParts; i++) {
    const start = i * partSize;
    const end = Math.min((i + 1) * partSize, jsonData['test-data'].length);
    parts.push(jsonData['test-data'].slice(start, end));
  }
  return parts;
};

// TODO: Send test data parts to LLM to fix it
// TODO: Combine fixed test data parts
// TODO: Replace API key placeholder with actual API key
// TODO: Send fixed test data to API
const main = async () => {
  const jsonData = await loadJson('./src/json/json.txt');
  console.log(jsonData['test-data'].length);
  const tokenCount = await calculateTokens(jsonData['test-data']);
  console.log(`Number of tokens in test-data: ${tokenCount}`);
  const parts = splitTestData(tokenCount, jsonData);
  console.log(parts.length);
};

main();

