import { v4 as uuid } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AgentService } from './agent-service';
import { Document, State } from './types';

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
    documents: [],
    config: {
      max_steps: 5,
      current_step: 0,
    },
  };

  async answer(question: string) {
    const facts: Document[] = [];
    const conversations: Document[] = [];
    this.state.config.current_step = 0;

    for (; this.state.config.current_step < this.state.config.max_steps; this.state.config.current_step++) {
      console.log(`🤔 Planning step ${this.state.config.current_step + 1}...`);

      const nextMove = await this.agentService.plan(
        [{ role: 'user', content: question }],
        this.state.tools,
        facts,
        conversations,
        this.state.documents,
      );

      console.log('➡️ Next move:', nextMove);

      if (!nextMove.tool) {
        break;
      }

      if (nextMove.tool === 'final_answer') {
        const finalAnswer = await this.agentService.generateAnswer(
          [{ role: 'user', content: question }],
          facts,
          conversations,
          nextMove.query,
          this.state.documents,
        );

        console.log(`💡 Final answer: `, finalAnswer);
        return finalAnswer.answer;
      }
    }

    return 'I was unable to generate a response';
  }
}
