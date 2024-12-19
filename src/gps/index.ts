import { v4 as uuid } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AgentService } from './agent-service';
import { State } from './types';

const fetchInputData = async (sendRequestSkill: SendRequestSkill): Promise<{ question: string }> => {
  const response = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/gps_question.json`,
  );
  return response as { question: string };
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const openAIService = new OpenAISkill(process.env.OPENAI_API_KEY);
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const agent = new AgentService(openAIService, langfuseService);

  const inputData = await fetchInputData(sendRequestSkill);
  console.log('Input data:', inputData);

  const state: State = {
    tools: [
      {
        uuid: uuid(),
        name: 'final_answer',
        description: 'Use this tool to write a message to the user',
        instruction: '...',
        parameters: JSON.stringify({}),
      },
      {
        uuid: uuid(),
        name: 'scan_location',
        description: 'Use this tool to scan a location for people',
        instruction: '...',
        parameters: JSON.stringify({ query: 'name of the location to scan' }),
      },
    ],
    documents: [],
    messages: [{ role: 'user', content: inputData.question }],
    actions: [],
    config: {
      max_steps: 5,
      current_step: 0,
    },
  };

  // TODO: Add call API tool (get location users)
  // TODO: Add query DB tool (get user id)
  // TODO: Add check user coordinates tool
  for (; state.config.current_step < state.config.max_steps; state.config.current_step++) {
    console.log(`🤔 Planning...`);
    const nextMove = await agent.plan(state);
    console.log('➡️ Next move:', nextMove._thinking);
    console.table([
      {
        Tool: nextMove.tool,
        Query: nextMove.query,
      },
    ]);

    if (!nextMove.tool || nextMove.tool === 'final_answer') {
      break;
    }

    state.config.active_step = { name: nextMove.tool, query: nextMove.query };
    // TODO: Generate parameters for the tool
    const parameters = await agent.describeTool(state, nextMove.tool, nextMove.query);
    console.log('🔍 Tool parameters:', parameters);
    // TODO: Use the tool
  }

  const finalAnswer = await agent.generateAnswer(state);
  console.log(`💡 Final answer: `, finalAnswer);

  // TODO: Remove information about Barbara
  // TODO: Report result
};

main();
