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

  // TODO: Build context from ingested reports and facts
  // TODO: Use extract keywords with context prompt to get keywords for each relevant report
  // TODO: Report result to HQ
}

main();
