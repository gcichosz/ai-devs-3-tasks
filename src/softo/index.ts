import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AssistantService } from './assistant-service';
import type { IAssistantTools, IWebPage } from './types';

// TODO: Save visited links summary and their links
// TODO: Try answering questions based on the scraped page
// TODO: Pick best link to follow (rank potential links)
// TODO: Add visited links tracking

const tools: IAssistantTools[] = [
  {
    name: 'answer',
    description:
      "Use this tool to contact with the user / provide final answer or inform about the lack of information or that you don't know what to do due to your limitations / missing data / skills.",
  },
  {
    name: 'scrape_page',
    description: 'Use to scrape an exact URL to get https://softo.ag3nts.org/ page or sub-page content.',
  },
];

const knownLinks: IWebPage[] = [
  {
    url: 'https://softo.ag3nts.org/',
    description: 'SoftoAI main page.',
  },
];

const fetchQuestions = async (sendRequestSkill: SendRequestSkill): Promise<Record<string, string>> => {
  return (await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/softo.json`,
  )) as Record<string, string>;
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const firecrawlService = new ScrapeWebSkill(process.env.FIRECRAWL_API_KEY, [
    { name: 'softoAI', url: 'https://softo.ag3nts.org/' },
  ]);
  const assistantService = new AssistantService(openAiSkill, langfuseService, firecrawlService);

  const questions = await fetchQuestions(sendRequestSkill);
  console.log(questions);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [_, question] of Object.entries(questions)) {
    const context = '';
    const nextStep = await assistantService.understand([{ role: 'user', content: question }], tools, context);
    console.log('Next step:');
    console.log(nextStep);

    if (nextStep.plan.tool === 'scrape_page') {
      const scrapePageResult = await assistantService.scrapePage(
        [{ role: 'user', content: nextStep.plan.query }],
        knownLinks,
      );
      console.log(scrapePageResult);
    }

    break;
  }
};

main();
