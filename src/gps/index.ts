import { v4 as uuid } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { AgentService } from './agent-service';
import { IdentifyPeopleService } from './identify-people-service';
import { ScanLocationService } from './scan-location-service';
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
  const scanLocationService = new ScanLocationService(sendRequestSkill);
  const identifyPeopleService = new IdentifyPeopleService(sendRequestSkill);
  const agent = new AgentService(openAIService, scanLocationService, identifyPeopleService);

  const inputData = await fetchInputData(sendRequestSkill);
  console.log('Input data:', inputData);

  const state: State = {
    tools: [
      {
        uuid: uuid(),
        name: 'final_answer',
        description: 'Use this tool to write a message to the user',
        parameters: JSON.stringify({}),
      },
      {
        uuid: uuid(),
        name: 'scan_location',
        description: 'Use this tool to scan a location for people',
        parameters: JSON.stringify({ query: 'name of the location to scan' }),
      },
      {
        uuid: uuid(),
        name: 'identify_people',
        description: 'Use this tool find people ids',
        parameters: JSON.stringify({ query: 'an array of people names' }),
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
    const parameters = await agent.describeTool(state, nextMove.tool, nextMove.query);
    console.log('🔍 Tool parameters:', parameters);
    const action = await agent.useTool(nextMove.tool, parameters);
    if (action) {
      state.actions.push(action);
    }
  }

  const finalAnswer = await agent.generateAnswer(state);
  console.log(`💡 Final answer: `, finalAnswer);

  // TODO: Remove information about Barbara
  // TODO: Report result
};

main();
