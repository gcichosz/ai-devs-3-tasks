import { promises as fs } from 'fs';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import path from 'path';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SpeechToTextSkill } from '../skills/speech-to-text/speech-to-text-skill';
import { LangfuseService } from '../utils/lang-fuse/langfuse-service';

enum FileType {
  TXT = 'txt',
  MP3 = 'mp3',
  PNG = 'png',
}

interface InputFile {
  name: string;
  type: FileType;
  content: string | Buffer;
  transcription?: string;
  keywords?: string;
}

const readFiles = async (directory: string): Promise<InputFile[]> => {
  const filenames = await fs.readdir(directory);

  const fileContents = await Promise.all(
    filenames.map(async (filename) => {
      const extension = path.extname(filename).slice(1) as FileType;
      const fileContent =
        extension === FileType.TXT
          ? await fs.readFile(path.join(directory, filename), 'utf-8')
          : await fs.readFile(path.join(directory, filename));
      return { name: filename, type: extension, content: fileContent };
    }),
  );

  return fileContents;
};

const transcribeFiles = async (files: InputFile[]): Promise<InputFile[]> => {
  const speechToTextSkill = new SpeechToTextSkill(process.env.GROQ_API_KEY);
  const imageManipulationSkill = new ImageManipulationSkill();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const transcribeTextPrompt = await langfuseService.getPrompt('transcribe-text');
  const [transcribeTextSystemMessage] = transcribeTextPrompt.compile();

  let base64Image: string | undefined;
  let imageTranscriptionResponse: string | undefined;
  const transcriptionPromise = files.map(async (file) => {
    switch (file.type) {
      case FileType.TXT:
        return { ...file, transcription: file.content as string };
      case FileType.MP3:
        return { ...file, transcription: await speechToTextSkill.transcribe(file.content as Buffer, 'en') };
      case FileType.PNG:
        base64Image = await imageManipulationSkill.prepareImageFromBuffer(file.content as Buffer);
        imageTranscriptionResponse = await openAiSkill.vision(
          (transcribeTextSystemMessage as unknown as ChatCompletionMessageParam).content as string,
          base64Image,
        );
        return { ...file, transcription: imageTranscriptionResponse };
    }
  });
  return await Promise.all(transcriptionPromise);
};

const ingestFiles = async (files: InputFile[], directory: string) => {
  await Promise.all(
    files.map(async (file) => {
      const data = {
        text: file.transcription,
        metadata: {
          filename: file.name,
        },
      };

      await fs.writeFile(path.join(directory, `${file.name}.json`), JSON.stringify(data, null, 2));
    }),
  );
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
  let existingReports: string[] = [];
  try {
    existingReports = await fs.readdir('./src/metadata/ingested-reports');
  } catch {
    await fs.mkdir('./src/metadata/ingested-reports', { recursive: true });
  }

  if (!existingReports.length) {
    const reportFiles = await readFiles('./src/metadata/reports');
    console.log(reportFiles.map((file) => file.name));

    const transcribedReports = await transcribeFiles(reportFiles);
    console.log(transcribedReports.map((file) => file.transcription));

    await ingestFiles(transcribedReports, './src/metadata/ingested-reports');
  }

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

    const transcribedFacts = await transcribeFiles(relevantFacts);
    console.log(transcribedFacts.map((file) => file.transcription));

    await ingestFiles(transcribedFacts, './src/metadata/ingested-facts');
  }

  const context = await buildContext();
  console.log(context);

  const reportFiles = await readFiles('./src/metadata/reports');
  const textReports = reportFiles.filter((file) => file.type === FileType.TXT);
  console.log(textReports.map((file) => file.name));

  const reportsWithKeywords = await extractKeywords(textReports, context);
  console.log(reportsWithKeywords.map((report) => report.keywords));

  // TODO: Report result to HQ
}

main();
