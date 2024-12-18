// TODO: Create main agent loop skeleton
// TODO: Add initial plan 'tool'
// TODO: Add select next step 'tool'
// TODO: Add final answer tool
// TODO: Add query DB tool (get user id)
// TODO: Add call API tool (get location users)
// TODO: Add check user coordinates tool
// TODO: Remove information about Barbara
// TODO: Report result

import { SendRequestSkill } from '../skills/send-request/send-request-skill';

const fetchInputData = async (sendRequestSkill: SendRequestSkill): Promise<{ question: string }> => {
  const response = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/gps_question.json`,
  );
  return response as { question: string };
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  const inputData = await fetchInputData(sendRequestSkill);
  console.log('Input data:', inputData);
};

main();
