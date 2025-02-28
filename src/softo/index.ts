import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AssistantService } from './assistant-service';
import type { IAssistantTools, IState, IWebPage } from './types';

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

  const state: IState = { answered: false, answers: [], visitedLinks: [] };
  for (const [questionId, question] of Object.entries(questions)) {
    state.answered = false;
    state.visitedLinks = [];

    for (let i = 0; i < 10; i++) {
      const nextStep = await assistantService.understand([{ role: 'user', content: question }], tools, knownLinks);
      console.log('Next step:');
      console.log(nextStep);

      if (nextStep.plan.tool === 'scrape_page') {
        const scrapePageResult = await assistantService.scrapePage(
          [{ role: 'user', content: nextStep.plan.query }],
          knownLinks,
          state.visitedLinks,
        );
        console.log('Scraped page:');
        console.log(scrapePageResult);

        const existingLink = knownLinks.find((knownLink) => knownLink.url === scrapePageResult.url);
        if (existingLink) {
          existingLink.content = scrapePageResult.content;
          state.visitedLinks.push({ url: existingLink.url, description: existingLink.description });
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
        console.log('Visited links:');
        console.log(state.visitedLinks);
      }
      if (nextStep.plan.tool === 'answer') {
        const questionAnswer = await assistantService.answerQuestion([{ role: 'user', content: question }], knownLinks);
        console.log('Answer:');
        console.log(questionAnswer);
        state.answered = true;
        state.answers.push({ id: questionId, answer: questionAnswer.answer });
      }

      if (state.answered) {
        break;
      }
    }
  }

  console.log('Final answers:');
  console.log(state.answers);

  const reportResult = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'softo',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: state.answers.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.answer }), {}),
  });
  console.log(reportResult);
};

main();
