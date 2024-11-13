// TODO: Report the image

import { ImageGenerationSkill } from '../skills/image-generation/image-generation-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';

const fetchTestimony = async () => {
  const sendRequestSkill = new SendRequestSkill();
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
  const testimony = await fetchTestimony();
  console.log(testimony);

  const imageUrl = await generateImage(testimony.description as string);
  console.log(imageUrl);
};

main();
