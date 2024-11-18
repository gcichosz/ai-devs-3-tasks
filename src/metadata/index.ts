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

// TODO: Filter facts
// TODO: Convert facts to files with metadata
// TODO: ...

const readFiles = async (): Promise<InputFile[]> => {
  const filesDirectory = './src/metadata/reports';
  const filenames = await fs.readdir(filesDirectory);

  const fileContents = await Promise.all(
    filenames.map(async (filename) => {
      const extension = path.extname(filename).slice(1) as FileType;
      const fileContent =
        extension === FileType.TXT
          ? await fs.readFile(path.join(filesDirectory, filename), 'utf-8')
          : await fs.readFile(path.join(filesDirectory, filename));
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

const ingestFiles = async (files: InputFile[]) => {
  await Promise.all(
    files.map(async (file) => {
      const data = {
        text: file.transcription,
        metadata: {
          filename: file.name,
        },
      };

      await fs.writeFile(
        path.join('./src/metadata/ingested-reports', `${file.name}.json`),
        JSON.stringify(data, null, 2),
      );
    }),
  );
};

async function main() {
  let existingFiles: string[] = [];
  try {
    existingFiles = await fs.readdir('./src/metadata/ingested-reports');
  } catch {
    await fs.mkdir('./src/metadata/ingested-reports', { recursive: true });
  }

  if (!existingFiles.length) {
    const files = await readFiles();
    console.log(files.map((file) => file.name));

    const transcribedFiles = await transcribeFiles(files);
    console.log(transcribedFiles.map((file) => file.transcription));

    await ingestFiles(transcribedFiles);
  }
}

main();
