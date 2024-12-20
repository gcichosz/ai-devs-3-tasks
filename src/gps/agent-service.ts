import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { v4 as uuid } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { answerPrompt, describeToolPrompt, planPrompt } from './agent-prompts';
import { IdentifyPeopleService } from './identify-people-service';
import { LocatePeopleService } from './locate-people-service';
import { ScanLocationService } from './scan-location-service';
import { Action, State } from './types';

export class AgentService {
  constructor(
    private readonly openAIService: OpenAISkill,
    private readonly scanLocationService: ScanLocationService,
    private readonly identifyPeopleService: IdentifyPeopleService,
    private readonly locatePeopleService: LocatePeopleService,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async useTool(tool: string, parameters: any): Promise<Action | null> {
    if (tool === 'scan_location') {
      const result = await this.scanLocationService.scan(parameters.query);
      return {
        uuid: uuid(),
        name: tool,
        parameters: JSON.stringify(parameters),
        description: 'Location scan results for the query ' + parameters.query,
        results: [result],
        tool_uuid: tool,
      };
    }

    if (tool === 'translate_names_to_ids') {
      const result = await this.identifyPeopleService.identify(parameters.query);
      return {
        uuid: uuid(),
        name: tool,
        parameters: JSON.stringify(parameters),
        description: 'People identification results for the query ' + parameters.query,
        results: result,
        tool_uuid: tool,
      };
    }

    if (tool === 'get_coordinates') {
      const result = await this.locatePeopleService.locate(parameters.query);
      return {
        uuid: uuid(),
        name: tool,
        parameters: JSON.stringify(parameters),
        description: 'People location results for the query ' + parameters.query,
        results: result,
        tool_uuid: tool,
      };
    }

    return null;
  }
}
