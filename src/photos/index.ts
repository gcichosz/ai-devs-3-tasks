// TODO: Handle different ways of getting photos
// TODO: Figure out what to do with each photo
// TODO: Figure out which pictures show Barbara
// TODO: Get Barbara's photo description
// TODO: Report the result

import { SendRequestSkill } from '../skills/send-request/send-request-skill';

const startConversation = async (sendRequestSkill: SendRequestSkill) => {
  const startResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'photos',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: 'START',
  });
  console.log(startResponse);
  return startResponse.message;
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  const getPhotosInstructions = await startConversation(sendRequestSkill);
  console.log(getPhotosInstructions);
};

main();
