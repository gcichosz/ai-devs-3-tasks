import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Step 3 - Create function to fetch and process challenge URLs in parallel
//       - Fetch both URLs simultaneously
//       - Extract "data" and "task" fields
//       - Process according to task instructions
//       - Return results in Polish

// TODO: Step 4 - Create function to combine results from both challenges

// TODO: Step 5 - Create main function that:
//       - Solves challenges
//       - Sends final response with:
//         {
//           apikey: string,
//           timestamp: number,
//           signature: string,
//           answer: string | any
//         }

const mainEndpoint = 'https://rafal.ag3nts.org/b46c3';

const getHash = async (sendRequestSkill: SendRequestSkill): Promise<string> => {
  const response = await sendRequestSkill.postRequest(mainEndpoint, {
    password: 'NONOMNISMORIAR',
  });
  console.log(response);
  return response.message as string;
};

const getChallengeDetails = async (sendRequestSkill: SendRequestSkill, hash: string) => {
  const response = await sendRequestSkill.postRequest(mainEndpoint, {
    sign: hash,
  });
  console.log(response);
  const { timestamp, signature, challenges } = response.message as {
    timestamp: number;
    signature: string;
    challenges: string[];
  };
  return {
    timestamp,
    signature,
    challenges,
  };
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  const hash = await getHash(sendRequestSkill);
  console.log('#️⃣ Hash:', hash);

  const { timestamp, signature, challenges } = await getChallengeDetails(sendRequestSkill, hash);
  console.log('🕒 Timestamp:', timestamp);
  console.log('🔑 Signature:', signature);
  console.log('🔗 Challenge URLs:', challenges);
};

main();
