import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { Action, Document, Tool } from './types';

export class AgentService {
  constructor(
    private readonly openaiService: OpenAISkill,
    private readonly langfuseService: LangfuseService,
  ) {}

  async plan(messages: ChatCompletionMessageParam[], tools: Tool[], documents: Document[], actions: Action[]) {
    const planPrompt = await this.langfuseService.getPrompt('heart-plan');
    const [planPromptMessage] = planPrompt.compile({
      tools: tools.map((t) => this.formatTool(t)).join('\n'),
      documents: documents.map((d) => this.formatDocument(d)).join('\n'),
      actions: actions.map((a) => this.formatAction(a)).join('\n'),
    });

    const plan = (await this.openaiService.completionFull(
      [planPromptMessage as never, ...messages],
      'gpt-4o-mini',
      true,
    )) as ChatCompletion;

    const result = JSON.parse(plan.choices[0].message.content ?? '{}');
    return Object.prototype.hasOwnProperty.call(result, 'tool') ? result : null;
  }

  async generateAnswer(
    messages: ChatCompletionMessageParam[],
    documents: Document[],
    actions: Action[],
    thoughts: string,
  ) {
    const answerPrompt = await this.langfuseService.getPrompt('heart-answer');
    const [answerPromptMessage] = answerPrompt.compile({
      thoughts,
      documents: documents.map((d) => this.formatDocument(d)).join('\n'),
      actions: actions.map((a) => this.formatAction(a)).join('\n'),
    });

    const answer = await this.openaiService.completionFull([answerPromptMessage as never, ...messages], 'gpt-4o-mini');

    return JSON.parse(answer.choices[0].message.content ?? '{}');
  }

  private formatTool(tool: Tool) {
    return `<tool>${tool.name}: ${tool.description}; usage: ${tool.parameters}</tool>`;
  }

  private formatDocument(document: Document) {
    return `<document metadata="${JSON.stringify(document.metadata)}">${document.text}</document>`;
  }

  private formatAction(action: Action) {
    return `<action name="${action.name}" parameters="${action.parameters}">${action.results
      .map(this.formatDocument)
      .join('\n')}</action>`;
  }
}
