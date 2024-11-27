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
    context: string,
  ): Promise<INextStep> {
    const understandPrompt = await this.langfuseService.getPrompt('softo-understand');
    const [understandPromptMessage] = understandPrompt.compile({
      tools: tools.map((tool) => `<tool>${tool.name}: ${tool.description}</tool>`).join('\n'),
      context: context || 'No context provided.',
    });

    const understanding = (await this.openaiService.completionFull(
      [understandPromptMessage as never, ...messages],
      'gpt-4o-mini',
      true,
    )) as ChatCompletion;

    return JSON.parse(understanding.choices[0].message.content as string) as INextStep;
  }

  async scrapePage(messages: ChatCompletionMessageParam[], knownLinks: IWebPage[]) {
    const selectPagePrompt = await this.langfuseService.getPrompt('softo-select-page');
    const [selectPagePromptMessage] = selectPagePrompt.compile({
      knownLinks: knownLinks
        .map((link) => `<link>${link.url}: ${link.description};${link.summary || ''}</link>`)
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

    const pageContent = await this.firecrawlService.scrapeUrl(selectedLink.url);
    return pageContent;
  }
}
