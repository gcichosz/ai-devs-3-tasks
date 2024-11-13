import { ImageGenerationSkill } from '../skills/image-generation/image-generation-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';

const fetchTestimony = async (sendRequestSkill: SendRequestSkill) => {
  const testimony = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/robotid.txt`,
  );
  return testimony as Record<string, unknown>;
};

const generateImage = async (testimony: string) => {
  const imageGenerationSkill = new ImageGenerationSkill(process.env.OPENAI_API_KEY);
  const imageUrl = await imageGenerationSkill.generateImage(testimony);
  return imageUrl;
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  const testimony = await fetchTestimony(sendRequestSkill);
  console.log(testimony);

  const imageUrl = await generateImage(testimony.description as string);
  console.log(imageUrl);

  const reportResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'robotid',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: imageUrl,
  });
  console.log(reportResponse);
};

main();
