import { promises as fs } from 'fs';
import path from 'path';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/lang-fuse/langfuse-service';

interface InputFile {
  name: string;
  content: string;
  keywords?: string;
}

const readFiles = async (directory: string): Promise<InputFile[]> => {
  const filenames = await fs.readdir(directory);

  const fileContents = await Promise.all(
    filenames.map(async (filename) => {
      const fileContent = await fs.readFile(path.join(directory, filename), 'utf-8');
      return { name: filename, content: fileContent };
    }),
  );

  return fileContents;
};

const ingestFacts = async (files: InputFile[], directory: string) => {
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const extractPersonKeywordsPrompt = await langfuseService.getPrompt('extract-person-keywords');
  const [extractPersonKeywordsSystemMessage] = extractPersonKeywordsPrompt.compile({});

  const ingestedFacts = await Promise.all(
    files.map(async (file) => {
      const personResponse = await openAiSkill.completionFull([
        {
          role: 'system',
          content:
            'Extract the main person full name (first name and last name) from the text. Return only the name without any additional text.',
        },
        { role: 'user', content: file.content },
      ]);

      const keywordsResponse = await openAiSkill.completionFull([
        extractPersonKeywordsSystemMessage as never,
        { role: 'user', content: file.content },
      ]);

      return {
        text: file.content,
        metadata: {
          filename: file.name,
          person: personResponse.choices[0].message.content,
          keywords: keywordsResponse.choices[0].message.content,
        },
      };
    }),
  );

  await fs.writeFile(path.join(directory, 'ingested-facts.json'), JSON.stringify(ingestedFacts, null, 2));
};

const buildContext = async () => {
  const ingestedFiles: string[] = [];
  const ingestedReportsDir = './src/metadata/ingested-reports';
  const reportFiles = await fs.readdir(ingestedReportsDir);

  for (const file of reportFiles) {
    const reportContent = await fs.readFile(path.join(ingestedReportsDir, file), 'utf-8');
    ingestedFiles.push(reportContent);
  }

  const ingestedFactsDir = './src/metadata/ingested-facts';
  const factFiles = await fs.readdir(ingestedFactsDir);

  for (const file of factFiles) {
    const factContent = await fs.readFile(path.join(ingestedFactsDir, file), 'utf-8');
    ingestedFiles.push(factContent);
  }

  return ingestedFiles.join('\n');
};

const extractKeywords = async (files: InputFile[], context: string) => {
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const extractKeywordsPrompt = await langfuseService.getPrompt('extract-keywords-with-context');
  const [extractKeywordsSystemMessage] = extractKeywordsPrompt.compile({ context });

  const keywordsPromise = files.map(async (file) => {
    const keywordsResponse = await openAiSkill.completionFull([
      extractKeywordsSystemMessage as never,
      { role: 'user', content: file.content as string },
    ]);
    return { ...file, keywords: keywordsResponse.choices[0].message.content };
  });
  return await Promise.all(keywordsPromise);
};

async function main() {
  let existingFacts: string[] = [];
  try {
    existingFacts = await fs.readdir('./src/metadata/ingested-facts');
  } catch {
    await fs.mkdir('./src/metadata/ingested-facts', { recursive: true });
  }

  if (!existingFacts.length) {
    const factFiles = await readFiles('./src/metadata/facts');
    console.log(factFiles.map((file) => file.name));

    const relevantFacts = factFiles.filter((file) => !file.content.includes('entry deleted'));
    console.log(relevantFacts.map((file) => file.name));

    await ingestFacts(relevantFacts, './src/metadata/ingested-facts');
  }

  const facts = await fs.readFile('./src/metadata/ingested-facts/ingested-facts.json', 'utf-8');
  const factsJson = JSON.parse(facts);
  console.log(factsJson);

  // TODO: Build context dynamically using matching facts (people)
  const context = await buildContext();
  console.log(context);

  const reportFiles = await readFiles('./src/metadata/reports');
  const textReports = reportFiles.filter((file) => file.name.endsWith('.txt'));
  console.log(textReports.map((file) => file.name));

  const reportsWithKeywords = await extractKeywords(textReports, context);
  console.log(reportsWithKeywords.map((report) => report.keywords));

  const report = reportsWithKeywords
    .map((report) => ({ [report.name]: report.keywords }))
    .reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});
  console.log(report);

  const sendRequestSkill = new SendRequestSkill();
  const reportResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'dokumenty',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: report,
  });
  console.log(reportResponse);
}

main();
