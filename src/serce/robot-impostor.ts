import { v4 as uuid } from 'uuid';

import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { SpeechToTextSkill } from '../skills/speech-to-text/speech-to-text-skill';
import { AgentService } from './agent-service';
import { Action, Document, State } from './types';

export class RobotImpostor {
  constructor(
    private readonly agentService: AgentService,
    private readonly sendRequestSkill: SendRequestSkill,
    private readonly speechToTextSkill: SpeechToTextSkill,
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
      {
        uuid: uuid(),
        name: 'remember',
        description: 'Use this tool to save important information for later use',
        instruction: 'Use this tool to store a fact or piece of information that might be useful later',
        parameters: JSON.stringify({
          text: 'The information to remember',
          metadata: 'Optional metadata about this information (JSON object)',
        }),
      },
      {
        uuid: uuid(),
        name: 'transcribe',
        description: 'Use this tool to download and transcribe audio files',
        instruction: 'Use this tool to download and transcribe audio files',
        parameters: JSON.stringify({
          url: 'The URL of the audio file to download and transcribe',
        }),
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

      if (nextMove.tool === 'remember') {
        const params = JSON.parse(nextMove.query);
        const newDocument: Document = {
          uuid: uuid(),
          text: params.text,
          metadata: params.metadata || {},
        };

        const tool = this.state.tools.find((t) => t.name === 'remember')!;
        const action: Action = {
          uuid: tool.uuid,
          name: tool.name,
          parameters: nextMove.query,
          description: tool.description,
          results: [newDocument],
          tool_uuid: tool.uuid,
        };
        this.state.actions.push(action);

        this.state.documents.push(newDocument);
        console.log(`🧠 Remembered: ${params.text}`);
      }

      if (nextMove.tool === 'transcribe') {
        const params = typeof nextMove.query === 'string' ? JSON.parse(nextMove.query) : nextMove.query;
        const audioBuffer = await this.sendRequestSkill.downloadFile(params.url);
        const transcription = await this.speechToTextSkill.transcribe(audioBuffer);

        const newDocument: Document = {
          uuid: uuid(),
          text: transcription,
          metadata: { url: params.url },
        };

        const tool = this.state.tools.find((t) => t.name === 'transcribe')!;
        const action: Action = {
          uuid: tool.uuid,
          name: tool.name,
          parameters: nextMove.query,
          description: tool.description,
          results: [newDocument],
          tool_uuid: tool.uuid,
        };

        this.state.actions.push(action);
        this.state.documents.push(newDocument);

        console.log(`🎤 Transcribed: ${transcription}`);
      }
    }

    return 'I was unable to generate a response';
  }
}
