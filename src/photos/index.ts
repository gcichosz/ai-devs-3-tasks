import { promises as fs } from 'fs';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

const FROM_CACHE = true;

interface Photo {
  filename: string;
  url?: string;
  buffer?: Buffer;
  base64?: string;
  command?: string;
  isPortrait?: boolean;
}

const startConversation = async (sendRequestSkill: SendRequestSkill) => {
  const startResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'photos',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: 'START',
  });
  console.log(startResponse);
  return startResponse.message as string;
};

const getPhotosUrls = async (
  getPhotosInstructions: string[],
  langfuseService: LangfuseService,
  openAiSkill: OpenAISkill,
) => {
  const findPhotoUrlsPrompt = await langfuseService.getPrompt('find-photo-url');
  const [findPhotoUrlsPromptMessage] = findPhotoUrlsPrompt.compile();

  const getPhotoInstructions = await Promise.all(
    getPhotosInstructions.map(async (instruction) => {
      const getPhotosUrlsResponse = await openAiSkill.completionFull(
        [
          findPhotoUrlsPromptMessage as never,
          {
            role: 'user',
            content: instruction,
          },
        ],
        'gpt-4o',
        true,
      );

      const responseJson = JSON.parse(getPhotosUrlsResponse.choices[0].message.content!);
      console.log(responseJson);
      return responseJson.photos as Photo[];
    }),
  );

  return getPhotoInstructions.flat();
};

const downloadPhotos = async (photos: Photo[], sendRequestSkill: SendRequestSkill): Promise<Photo[]> => {
  return await Promise.all(
    photos.map(async (photo) => {
      const photoResponse = await sendRequestSkill.downloadFile(photo.url!);
      return {
        ...photo,
        buffer: photoResponse,
      };
    }),
  );
};

const cachePhotos = async (photos: Photo[], imageManipulationSkill: ImageManipulationSkill) => {
  fs.mkdir('./src/photos/files', { recursive: true });
  await Promise.all(
    photos.map(async (photo) => {
      imageManipulationSkill.saveImageFromBuffer(photo.buffer!, `./src/photos/files/${photo.filename}`);
    }),
  );
};

const preparePhotos = async (photos: Photo[], imageManipulationSkill: ImageManipulationSkill) => {
  return await Promise.all(
    photos.map(async (photo) => {
      const base64 = await imageManipulationSkill.prepareImageFromBuffer(photo.buffer!);
      return {
        ...photo,
        base64,
      };
    }),
  );
};

const getPhotoCommands = async (photos: Photo[], langfuseService: LangfuseService, openAiSkill: OpenAISkill) => {
  const getPhotoCommandsPrompt = await langfuseService.getPrompt('get-photo-command');
  const [getPhotoCommandsPromptMessage] = getPhotoCommandsPrompt.compile();

  return await Promise.all(
    photos.map(async (photo) => {
      const getPhotoCommandsResponse = await openAiSkill.vision(
        getPhotoCommandsPromptMessage as never,
        [photo.base64!],
        'gpt-4o',
        true,
      );
      if (!getPhotoCommandsResponse) {
        return {
          ...photo,
          command: 'NOOP',
        };
      }
      const responseJson = JSON.parse(getPhotoCommandsResponse);
      console.log(photo.filename, responseJson);
      return {
        ...photo,
        command: responseJson.command as string,
      };
    }),
  );
};

const improvePhotos = async (photos: Photo[], sendRequestSkill: SendRequestSkill) => {
  return await Promise.all(
    photos.map(async (photo) => {
      if (photo.command === 'NOOP') {
        return;
      }

      const improvePhotoResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
        task: 'photos',
        apikey: process.env.AI_DEVS_API_KEY,
        answer: `${photo.command} ${photo.filename}`,
      });
      console.log(improvePhotoResponse);
      return improvePhotoResponse.message as string;
    }),
  );
};

const loadFromCache = async (filenames: string[], imageManipulationSkill: ImageManipulationSkill): Promise<Photo[]> => {
  const files = await Promise.all(
    filenames.map(async (filename) => {
      const buffer = await fs.readFile(`./src/photos/files/${filename}`);
      return {
        filename,
        buffer,
      };
    }),
  );
  return await preparePhotos(files, imageManipulationSkill);
};

const filterPhotos = async (
  photos: Photo[],
  langfuseService: LangfuseService,
  openAiSkill: OpenAISkill,
): Promise<Photo[]> => {
  const filterPhotosPrompt = await langfuseService.getPrompt('filter-portrait-photos');
  const [filterPhotosPromptMessage] = filterPhotosPrompt.compile();

  const filterPortraitPhotos = await Promise.all(
    photos.map(async (photo) => {
      const filterPhotosResponse = await openAiSkill.vision(
        filterPhotosPromptMessage as never,
        [photo.base64!],
        'gpt-4o',
        true,
      );

      const responseJson = JSON.parse(filterPhotosResponse);
      console.log(responseJson);
      return {
        ...photo,
        isPortrait: responseJson.isPortrait as boolean,
      };
    }),
  );

  return filterPortraitPhotos.filter((photo) => photo.isPortrait);
};

const getPersonDescription = async (photos: Photo[], langfuseService: LangfuseService, openAiSkill: OpenAISkill) => {
  const getPersonDescriptionPrompt = await langfuseService.getPrompt('get-person-description');
  const [getPersonDescriptionPromptMessage] = getPersonDescriptionPrompt.compile();

  const getPersonDescriptionResponse = await openAiSkill.vision(
    getPersonDescriptionPromptMessage as never,
    photos.map((photo) => photo.base64!),
    'gpt-4o',
    true,
  );

  console.log(getPersonDescriptionResponse);
  const responseJson = JSON.parse(getPersonDescriptionResponse);
  return responseJson.descriptions as string;
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const imageManipulationSkill = new ImageManipulationSkill();

  const conversationStart = await startConversation(sendRequestSkill);
  console.log(conversationStart);

  const fixedPhotos: Photo[] = FROM_CACHE
    ? await loadFromCache(
        ['IMG_1444.PNG', 'IMG_1410_FXER.PNG', 'IMG_1443_FT12.PNG', 'IMG_559_NRR7.PNG'],
        imageManipulationSkill,
      )
    : [];
  let photosToFix: Photo[] = [];
  let getPhotosInstructions = [conversationStart];

  if (!FROM_CACHE) {
    do {
      const photosUrls = await getPhotosUrls(getPhotosInstructions, langfuseService, openAiSkill);
      console.log(photosUrls);

      const photos = await downloadPhotos(photosUrls, sendRequestSkill);
      await cachePhotos(photos, imageManipulationSkill);
      console.log(photos.map((photo) => photo.filename));

      const preparedPhotos = await preparePhotos(photos, imageManipulationSkill);

      const commands = await getPhotoCommands(preparedPhotos, langfuseService, openAiSkill);
      console.log(commands.map((photo) => `${photo.command} ${photo.filename}`));

      fixedPhotos.push(...commands.filter((photo) => photo.command === 'NOOP'));
      photosToFix = commands.filter((photo) => photo.command !== 'NOOP');

      const improveResponses = await improvePhotos(photosToFix, sendRequestSkill);
      console.log(improveResponses);

      getPhotosInstructions = improveResponses as string[];
      console.log(getPhotosInstructions);
      console.log('Photos to fix:');
      console.log(photosToFix.map((photo) => photo.filename));
    } while (photosToFix.length > 0);

    console.log(fixedPhotos.map((photo) => photo.filename));
  }

  const barbaraPhotos = FROM_CACHE
    ? await loadFromCache(['IMG_1410_FXER.PNG', 'IMG_1443_FT12.PNG', 'IMG_559_NRR7.PNG'], imageManipulationSkill)
    : await filterPhotos(fixedPhotos, langfuseService, openAiSkill);
  console.log(barbaraPhotos.map((photo) => photo.filename));

  const description = await getPersonDescription(barbaraPhotos, langfuseService, openAiSkill);
  console.log(description);

  const reportResult = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'photos',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: description,
  });
  console.log(reportResult);
};

main();
