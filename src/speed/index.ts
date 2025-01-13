import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';

const mainEndpoint = 'https://rafal.ag3nts.org/b46c3';
const contextUrl = 'https://centrala.ag3nts.org/dane/arxiv-draft.html';

const getContext = async (scrapeWebSkill: ScrapeWebSkill) => {
  const scrapedContext = await scrapeWebSkill.scrapeUrl(contextUrl);
  return scrapedContext.markdown;
};

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

const answerFromCommonKnowledge = async (question: string, openaiSkill: OpenAISkill): Promise<string> => {
  const response = await openaiSkill.completionFull([
    {
      role: 'system',
      content: 'You are a helpful assistant. Answer the question in Polish as fast and concise as possible.',
    },
    { role: 'user', content: question },
  ]);
  console.log(`💡 Answer: ${question} -> ${response.choices[0].message.content}`);
  return response.choices[0].message.content!;
};

const solveCommonKnowledgeChallenge = async (data: string[], openaiSkill: OpenAISkill): Promise<string[]> => {
  return await Promise.all(data.map(async (question: string) => answerFromCommonKnowledge(question, openaiSkill)));
};

const answerFromContext = async (question: string, openaiSkill: OpenAISkill, context: string): Promise<string> => {
  const response = await openaiSkill.completionFull([
    {
      role: 'system',
      content: `Context:\n${context}\n\nAnswer the question in Polish as fast and concise as possible.`,
    },
    { role: 'user', content: question },
  ]);
  console.log(`💡 Answer: ${question} -> ${response.choices[0].message.content}`);
  return response.choices[0].message.content!;
};

const solveContextChallenge = async (data: string[], openaiSkill: OpenAISkill, context: string): Promise<string[]> => {
  return await Promise.all(data.map(async (question: string) => answerFromContext(question, openaiSkill, context)));
};

const solveChallenge = async (
  sendRequestSkill: SendRequestSkill,
  openaiSkill: OpenAISkill,
  challengeUrl: string,
  context: string,
): Promise<string[]> => {
  const response = await sendRequestSkill.getRequest(challengeUrl);
  console.log(`📝 Challenge response for ${challengeUrl}:`, response);
  const { data, task } = response as { data: string[]; task: string };

  switch (task) {
    case 'Odpowiedz na pytania':
      return solveCommonKnowledgeChallenge(data, openaiSkill);
    case 'Źródło wiedzy https://centrala.ag3nts.org/dane/arxiv-draft.html':
      return solveContextChallenge(data, openaiSkill, context);
    default:
      return [];
  }
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const openaiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const scrapeWebSkill = new ScrapeWebSkill(process.env.FIRECRAWL_API_KEY, [
    {
      name: 'arxiv',
      url: 'https://centrala.ag3nts.org',
    },
  ]);

  const context = await getContext(scrapeWebSkill);

  const hash = await getHash(sendRequestSkill);
  console.log('#️⃣ Hash:', hash);

  const { timestamp, signature, challenges } = await getChallengeDetails(sendRequestSkill, hash);
  console.log('🕒 Timestamp:', timestamp);
  console.log('🔑 Signature:', signature);
  console.log('🔗 Challenge URLs:', challenges);

  const answers = await Promise.all(
    challenges.map(async (challengeUrl) => solveChallenge(sendRequestSkill, openaiSkill, challengeUrl, context)),
  );
  const finalAnswer = answers.flat();
  console.log('🔑 Answers:', finalAnswer);
  console.log('⏱️ Duration:', (Date.now() - timestamp * 1000) / 1000);

  const response = await sendRequestSkill.postRequest(mainEndpoint, {
    apikey: process.env.AI_DEVS_API_KEY,
    timestamp,
    signature,
    answer: finalAnswer,
  });

  console.log('🏆 Report response:', response);
};

main();
