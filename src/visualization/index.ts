// TODO: Generate image based on testimony
// TODO: Report the image

import { SendRequestSkill } from '../skills/send-request/send-request-skill';

const fetchTestimony = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const testimony = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/robotid.txt`,
  );
  return testimony;
};

const main = async () => {
  const testimony = await fetchTestimony();
  console.log(testimony);
};

main();
