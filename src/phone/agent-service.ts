import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { Document, Tool } from './types';

export class AgentService {
  constructor(
    private readonly openaiService: OpenAISkill,
    private readonly langfuseService: LangfuseService,
  ) {}

  async plan(messages: ChatCompletionMessageParam[], tools: Tool[], facts: Document[], conversations: Document[]) {
    const planPrompt = await this.langfuseService.getPrompt('phone-plan');
    const [planPromptMessage] = planPrompt.compile({
      tools: tools.map((tool) => `<tool>${tool.name}: ${tool.description}</tool>`).join('\n'),
      facts: facts.map((f) => `<fact name="${f.metadata.name}">${f.text}</fact>`).join('\n'),
      conversations: conversations
        .map((c) => `<conversation name="${c.metadata.name}">${c.text}</conversation>`)
        .join('\n'),
    });

    const plan = (await this.openaiService.completionFull(
      [planPromptMessage as never, ...messages],
      'gpt-4o',
      true,
    )) as ChatCompletion;

    const result = JSON.parse(plan.choices[0].message.content ?? '{}');
    return Object.prototype.hasOwnProperty.call(result, 'tool') ? result : null;
  }

  async generateAnswer(
    messages: ChatCompletionMessageParam[],
    facts: Document[],
    conversations: Document[],
    thoughts: string,
  ) {
    const answerPrompt = await this.langfuseService.getPrompt('phone-answer');
    const [answerPromptMessage] = answerPrompt.compile({
      facts: facts.map((f) => `<fact name="${f.metadata.name}">${f.text}</fact>`).join('\n'),
      conversations: conversations
        .map((c) => `<conversation name="${c.metadata.name}">${c.text}</conversation>`)
        .join('\n'),
      thoughts,
    });

    const answer = await this.openaiService.completionFull([answerPromptMessage as never, ...messages], 'gpt-4o');

    return JSON.parse(answer.choices[0].message.content ?? '{}');
  }
}
