import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai';
import { SendRequestSkill } from '../skills/send-request';
// import { TokenizerSkill } from '../skills/tokenizer';
import { fixTestDataPrompt } from './prompts';

// const Gpt4oMiniOutputTokens = 16000;

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

// const calculateTokens = async (data: TestData[]): Promise<number> => {
//   const tokenizer = new TokenizerSkill();
//   const jsonString = JSON.stringify(data);
//   return await tokenizer.countTokens(jsonString, 'gpt-4o');
// };

// const splitTestData = (tokenCount: number, jsonData: CalibrationData): TestData[][] => {
//   const numberOfParts = Math.ceil(tokenCount / Gpt4oMiniOutputTokens);
//   const partSize = Math.ceil(jsonData['test-data'].length / numberOfParts);
//   const parts = [];
//   for (let i = 0; i < numberOfParts; i++) {
//     const start = i * partSize;
//     const end = Math.min((i + 1) * partSize, jsonData['test-data'].length);
//     parts.push(jsonData['test-data'].slice(start, end));
//   }
//   return parts;
// };

const fixTestData = async (testData: TestData[]): Promise<TestData[]> => {
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY || '');

  const fixedTestData: TestData[] = [];
  for (const data of testData) {
    const components = data.question.split(' + ');
    const answer = parseInt(components[0]) + parseInt(components[1]);

    if (!data.test) {
      fixedTestData.push({ question: data.question, answer: answer });
      continue;
    }

    const answerResponse = await openAiSkill.completionFull([
      { role: 'system', content: fixTestDataPrompt },
      { role: 'user', content: data.test.q },
    ]);
    const answerText = answerResponse.choices[0].message.content || '';
    fixedTestData.push({ question: data.question, answer: answer, test: { q: data.test.q, a: answerText } });
  }
  return fixedTestData;
};

const reportTestData = async (calibrationData: CalibrationData, fixedTestData: TestData[]) => {
  const sendRequestSkill = new SendRequestSkill()
  const fixedCalibrationData: CalibrationData = { ...calibrationData, apikey: process.env.AI_DEVS_API_KEY!, "test-data": fixedTestData };
  const response = await sendRequestSkill.postRequest("https://centrala.ag3nts.org/report", { task: "JSON", apikey: process.env.AI_DEVS_API_KEY, answer: fixedCalibrationData });
  return response
}

const main = async () => {
  const jsonData = await loadJson('./src/json/json.txt');
  console.log(jsonData['test-data'].length);
  // const tokenCount = await calculateTokens(jsonData['test-data']);
  // console.log(`Number of tokens in test-data: ${tokenCount}`);
  // const parts = splitTestData(tokenCount, jsonData);
  // console.log(parts.length);
  const fixedTestData = await fixTestData(jsonData['test-data']);
  console.log(fixedTestData);
  const calibrationResponse = await reportTestData(jsonData, fixedTestData);
  console.log(calibrationResponse);
};

main();
