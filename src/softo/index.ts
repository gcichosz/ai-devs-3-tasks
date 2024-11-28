import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AssistantService } from './assistant-service';
import type { IAssistantTools, IWebPage } from './types';

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

  const state: { answered: boolean; answers: { id: string; answer: string }[] } = { answered: false, answers: [] };
  for (const [questionId, question] of Object.entries(questions)) {
    state.answered = false;

    for (let i = 0; i < 3; i++) {
      const nextStep = await assistantService.understand([{ role: 'user', content: question }], tools, knownLinks);
      console.log('Next step:');
      console.log(nextStep);

      if (nextStep.plan.tool === 'scrape_page') {
        const scrapePageResult = await assistantService.scrapePage(
          [{ role: 'user', content: nextStep.plan.query }],
          knownLinks,
        );
        console.log('Scraped page:');
        console.log(scrapePageResult);

        const existingLink = knownLinks.find((knownLink) => knownLink.url === scrapePageResult.url);
        if (existingLink) {
          existingLink.content = scrapePageResult.content;
        } else {
          knownLinks.push({ ...scrapePageResult });
        }

        const pageLinks = await assistantService.getPageLinks(scrapePageResult);
        console.log('Page links:');
        console.log(pageLinks);

        for (const link of pageLinks) {
          if (!knownLinks.some((knownLink) => knownLink.url === link.url)) {
            knownLinks.push({ url: link.url, description: link.description });
          }
        }
        console.log('Known links:');
        console.log(knownLinks);
        continue;
      }
      if (nextStep.plan.tool === 'answer') {
        const questionAnswer = await assistantService.answerQuestion(
          [{ role: 'user', content: nextStep.plan.query }],
          knownLinks,
        );
        console.log('Answer:');
        console.log(questionAnswer);
        state.answered = true;
        state.answers.push({ id: questionId, answer: questionAnswer.answer });
        continue;
      }

      if (state.answered) {
        break;
      }
    }

    break;
  }

  console.log(state.answers);
};

main();
