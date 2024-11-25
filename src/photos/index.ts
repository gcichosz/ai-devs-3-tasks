// TODO: Download photos (with cache)
// TODO: Figure out what to do with each photo
// TODO: Figure out which pictures show Barbara
// TODO: Get Barbara's photo description
// TODO: Report the result

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

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
  getPhotosInstructions: string,
  langfuseService: LangfuseService,
  openAiSkill: OpenAISkill,
) => {
  const findPhotoUrlsPrompt = await langfuseService.getPrompt('find-photo-url');
  const [findPhotoUrlsPromptMessage] = findPhotoUrlsPrompt.compile();

  const getPhotosUrlsResponse = await openAiSkill.completionFull(
    [
      findPhotoUrlsPromptMessage as never,
      {
        role: 'user',
        content: getPhotosInstructions,
      },
    ],
    'gpt-4o',
    true,
  );

  const responseJson = JSON.parse(getPhotosUrlsResponse.choices[0].message.content!);
  console.log(responseJson);
  return responseJson.photos as string[];
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const getPhotosInstructions = await startConversation(sendRequestSkill);
  console.log(getPhotosInstructions);

  const photosUrls = await getPhotosUrls(getPhotosInstructions, langfuseService, openAiSkill);
  console.log(photosUrls);
};

main();
