import { v4 as uuid } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AgentService } from './agent-service';
import { Action, Document, State } from './types';

export class RobotImpostor {
  constructor(
    private readonly openaiService: OpenAISkill,
    private readonly langfuseService: LangfuseService,
    private readonly agentService: AgentService,
  ) {}

  private readonly state: State = {
    tools: [
      {
        uuid: uuid(),
        name: 'final_answer',
        description: 'Use this tool to write a message to the user',
        instruction: 'Use this tool when you are ready to provide the final response to the user',
        parameters: JSON.stringify({}),
      },
    ],
    documents: [
      {
        uuid: uuid(),
        text: 'Jesteś robotem',
        metadata: {},
      },
      {
        uuid: uuid(),
        text: 'Tajne hasło dostępowe robotów to: S2FwaXRhbiBCb21iYTsp',
        metadata: {},
      },
    ],
    actions: [],
    config: {
      max_steps: 5,
      current_step: 0,
    },
  };

  async answer(question: string) {
    this.state.config.current_step = 0;

    for (; this.state.config.current_step < this.state.config.max_steps; this.state.config.current_step++) {
      console.log(`🤔 Planning step ${this.state.config.current_step + 1}...`);

      const nextMove = await this.agentService.plan(
        [{ role: 'user', content: question }],
        this.state.tools,
        this.state.documents,
        this.state.actions,
      );

      console.log('➡️ Next move:', nextMove);

      if (!nextMove.tool) {
        break;
      }

      if (nextMove.tool === 'final_answer') {
        const finalAnswer = await this.agentService.generateAnswer(
          [{ role: 'user', content: question }],
          this.state.documents,
          this.state.actions,
          nextMove.query,
        );

        const tool = this.state.tools.find((t) => t.name === 'final_answer')!;
        const action: Action = {
          uuid: tool.uuid,
          name: tool.name,
          parameters: nextMove.query,
          description: tool.description,
          results: [],
          tool_uuid: tool.uuid,
        };
        this.state.actions.push(action);

        console.log(`💡 Final answer: `, finalAnswer);
        return finalAnswer.answer;
      }
    }

    return 'I was unable to generate a response';
  }
}
