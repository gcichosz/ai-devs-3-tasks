import { promises as fs } from 'fs';
import { ChatCompletion } from 'openai/resources/chat/completions';
import path from 'path';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { SpeechToTextSkill } from '../skills/speech-to-text/speech-to-text-skill';
import { LangfuseService } from '../utils/lang-fuse/langfuse-service';

enum FileType {
  TXT = 'txt',
  MP3 = 'mp3',
  PNG = 'png',
}

interface ReportFile {
  name: string;
  type: FileType;
  content: string | Buffer;
  transcription?: string;
  topic?: string;
}

const readFiles = async (): Promise<ReportFile[]> => {
  const filesDirectory = './src/categories/factory-files';
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

const transcribeFiles = async (files: ReportFile[]): Promise<ReportFile[]> => {
  const speechToTextSkill = new SpeechToTextSkill(process.env.GROQ_API_KEY);
  const imageManipulationSkill = new ImageManipulationSkill();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const transcribeTextPrompt = await langfuseService.getPrompt('transcribe-text');
  const [transcribeTextSystemMessage] = transcribeTextPrompt.compile();

  let base64Image: string | undefined;
  let imageTranscriptionResponse: ChatCompletion | undefined;
  const transcriptionPromise = files.map(async (file) => {
    switch (file.type) {
      case FileType.TXT:
        return { ...file, transcription: file.content as string };
      case FileType.MP3:
        return { ...file, transcription: await speechToTextSkill.transcribe(file.content as Buffer, 'en') };
      case FileType.PNG:
        base64Image = await imageManipulationSkill.prepareImage('./src/categories/factory-files/' + file.name);
        imageTranscriptionResponse = await openAiSkill.completionFull(
          [
            transcribeTextSystemMessage as never,
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          'gpt-4o',
        );
        return { ...file, transcription: imageTranscriptionResponse.choices[0].message.content ?? '' };
    }
  });
  return await Promise.all(transcriptionPromise);
};

const findFileTopics = async (files: ReportFile[]): Promise<ReportFile[]> => {
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const peopleHardwareOtherPrompt = await langfuseService.getPrompt('people-hardware-other');
  const [peopleHardwareOtherSystemMessage] = peopleHardwareOtherPrompt.compile();

  const topicPromise = files.map(async (file) => {
    const topicResponse = await openAiSkill.completionFull([
      peopleHardwareOtherSystemMessage as never,
      { role: 'user', content: file.transcription as string },
    ]);
    return { ...file, topic: topicResponse.choices[0].message.content ?? '' };
  });
  return await Promise.all(topicPromise);
};

const main = async () => {
  const files = await readFiles();
  console.log(files.map((file) => file.name));

  const transcribedFiles = await transcribeFiles(files);
  console.log(transcribedFiles.map((file) => file.transcription));

  const fileTopics = await findFileTopics(transcribedFiles);
  console.log(fileTopics.map((file) => file.topic));

  const report = {
    people: fileTopics
      .filter((file) => file.topic === 'people')
      .map((file) => file.name)
      .sort(),
    hardware: fileTopics
      .filter((file) => file.topic === 'hardware')
      .map((file) => file.name)
      .sort(),
  };
  console.log(report);

  const sendRequestSkill = new SendRequestSkill();
  const reportResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'kategorie',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: report,
  });
  console.log(reportResponse);
};

main();
