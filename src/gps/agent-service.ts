import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { answerPrompt, describeToolPrompt, planPrompt } from './agent-prompts';
import { State } from './types';

export class AgentService {
  constructor(
    private readonly openAIService: OpenAISkill,
    private readonly langfuseService: LangfuseService,
  ) {}

  async plan(state: State) {
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: planPrompt(state),
    };

    const response = await this.openAIService.completionFull([systemMessage], 'gpt-4o', true);

    const result = JSON.parse(response.choices[0].message.content ?? '{}');
    return result?.tool ? result : null;
  }

  async generateAnswer(state: State) {
    const context = state.actions.flatMap((action) => action.results);
    const query = state.config.active_step?.query;

    const response = await this.openAIService.completionFull(
      [
        {
          role: 'system',
          content: answerPrompt({ context, query }),
        },
        ...state.messages,
      ],
      'gpt-4o',
    );

    return response.choices[0].message.content;
  }

  async describeTool(state: State, tool: string, query: string) {
    const toolInfo = state.tools.find((t) => t.name === tool);
    if (!toolInfo) {
      throw new Error(`Tool ${tool} not found`);
    }

    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: describeToolPrompt(state, toolInfo, query),
    };

    const response = await this.openAIService.completionFull([systemMessage], 'gpt-4o', true);
    return JSON.parse(response.choices[0].message.content ?? '{}');
  }
}
