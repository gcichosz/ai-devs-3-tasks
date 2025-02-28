import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import type { IAssistantTools, INextStep, IWebPage } from './types';

export class AssistantService {
  constructor(
    private readonly openaiService: OpenAISkill,
    private readonly langfuseService: LangfuseService,
    private readonly firecrawlService: ScrapeWebSkill,
  ) {}

  async understand(
    messages: ChatCompletionMessageParam[],
    tools: IAssistantTools[],
    knownLinks: IWebPage[],
  ): Promise<INextStep> {
    const understandPrompt = await this.langfuseService.getPrompt('softo-understand');
    const [understandPromptMessage] = understandPrompt.compile({
      tools: tools.map((tool) => `<tool>${tool.name}: ${tool.description}</tool>`).join('\n'),
      context: this.prepareKnownLinksContext(knownLinks),
    });

    const understanding = (await this.openaiService.completionFull(
      [understandPromptMessage as never, ...messages],
      'gpt-4o-mini',
      true,
    )) as ChatCompletion;

    return JSON.parse(understanding.choices[0].message.content as string) as INextStep;
  }

  async scrapePage(
    messages: ChatCompletionMessageParam[],
    knownLinks: IWebPage[],
    visitedLinks: IWebPage[],
  ): Promise<IWebPage> {
    const selectPagePrompt = await this.langfuseService.getPrompt('softo-select-page');
    const [selectPagePromptMessage] = selectPagePrompt.compile({
      knownLinks: knownLinks
        .map((link) => `<available_link>${link.url}: ${link.description}</available_link>`)
        .join('\n'),
      visitedLinks: visitedLinks
        .map((link) => `<visited_link>${link.url}: ${link.description}</visited_link>`)
        .join('\n'),
    });

    const linkSelection = (await this.openaiService.completionFull(
      [selectPagePromptMessage as never, ...messages],
      'gpt-4o-mini',
      true,
    )) as ChatCompletion;

    const selectedLink = JSON.parse(linkSelection.choices[0].message.content as string) as {
      _thinking: string;
      url: string;
    };
    console.log(selectedLink);

    const pageContent = await this.firecrawlService.scrapeUrl(selectedLink.url, ['markdown'], false);
    return {
      url: selectedLink.url,
      content: pageContent.markdown,
    };
  }

  async getPageLinks(page: IWebPage): Promise<IWebPage[]> {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: IWebPage[] = [];

    let match;
    while ((match = linkRegex.exec(page.content!)) !== null) {
      if (match[2].endsWith('.png') || match[2].endsWith('.jpg')) {
        continue;
      }

      let url;
      if (match[2].startsWith('http')) {
        url = match[2];
      } else {
        url = `https://softo.ag3nts.org${match[2]}`;
      }

      if (match[2].includes(' ')) {
        url = url.split(' ')[0];
      }

      links.push({
        url,
        description: match[1],
      });
    }

    return links;
  }

  async answerQuestion(messages: ChatCompletionMessageParam[], knownLinks: IWebPage[]) {
    const answerQuestionPrompt = await this.langfuseService.getPrompt('softo-answer-question');
    const [answerQuestionPromptMessage] = answerQuestionPrompt.compile({
      context: this.prepareKnownLinksContext(knownLinks),
    });

    const answer = (await this.openaiService.completionFull(
      [answerQuestionPromptMessage as never, ...messages],
      'gpt-4o-mini',
      true,
    )) as ChatCompletion;

    return JSON.parse(answer.choices[0].message.content as string);
  }

  private prepareKnownLinksContext(knownLinks: IWebPage[]): string {
    return knownLinks
      .map(
        (link) =>
          `<page>${link.url}: ${link.description}<content>${link.content || 'Content unknown.'}</content></page>`,
      )
      .join('\n');
  }
}
