import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Step 3 - Create function to fetch and process challenge URLs in parallel
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

const answerFromCommonKnowledge = async (question: string, openaiSkill: OpenAISkill) => {
  const response = await openaiSkill.completionFull([
    {
      role: 'system',
      content: 'You are a helpful assistant. Answer the question in Polish as fast and concise as possible.',
    },
    { role: 'user', content: question },
  ]);
  console.log(`💡 Answer: ${question} -> ${response.choices[0].message.content}`);
  return response.choices[0].message.content;
};

const solveCommonKnowledgeChallenge = async (data: string[], openaiSkill: OpenAISkill) => {
  return await Promise.all(data.map(async (question: string) => answerFromCommonKnowledge(question, openaiSkill)));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const solveContextChallenge = (_data: string[], _openaiSkill: OpenAISkill) => {
  return '';
};

const solveChallenge = async (sendRequestSkill: SendRequestSkill, openaiSkill: OpenAISkill, challengeUrl: string) => {
  const response = await sendRequestSkill.getRequest(challengeUrl);
  console.log(`📝 Challenge response for ${challengeUrl}:`, response);
  const { data, task } = response as { data: string[]; task: string };

  switch (task) {
    case 'Odpowiedz na pytania':
      return solveCommonKnowledgeChallenge(data, openaiSkill);
    case 'Źródło wiedzy https://centrala.ag3nts.org/dane/arxiv-draft.html':
      return solveContextChallenge(data, openaiSkill);
    default:
      return '';
  }
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const openaiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const hash = await getHash(sendRequestSkill);
  console.log('#️⃣ Hash:', hash);

  const { timestamp, signature, challenges } = await getChallengeDetails(sendRequestSkill, hash);
  console.log('🕒 Timestamp:', timestamp);
  console.log('🔑 Signature:', signature);
  console.log('🔗 Challenge URLs:', challenges);

  await Promise.all(
    challenges.map(async (challengeUrl) => solveChallenge(sendRequestSkill, openaiSkill, challengeUrl)),
  );

  console.log('⏱️ Duration:', (Date.now() - timestamp * 1000) / 1000);
};

main();
