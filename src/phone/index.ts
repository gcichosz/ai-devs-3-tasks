import { promises as fs } from 'fs';
import { v4 as uuid } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AgentService } from './agent-service';
import { loadFromCache } from './cache-service';
import { Document, State } from './types';

// TODO: Create function to reconstruct conversations based on start/end sentences
// TODO: Map each piece of conversation to its proper place

const getConversations = async (sendRequestSkill: SendRequestSkill): Promise<Document[]> => {
  const getOriginalConversations = async () => {
    const conversationsResponse = await sendRequestSkill.getRequest(
      `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/phone_sorted.json`,
    );
    return Object.entries(conversationsResponse).map(([id, sentences]) => ({
      uuid: uuid(),
      text: (sentences as string[]).join('\n'),
      metadata: {
        name: id,
      },
    })) as Document[];
  };
  const conversations = await loadFromCache('./src/phone/conversations', getOriginalConversations);
  return conversations.sort((a, b) => (a.metadata.name as string).localeCompare(b.metadata.name as string));
};

const loadFacts = async (): Promise<Document[]> => {
  const getOriginalFacts = async () => {
    const sourceFactFiles = await fs.readdir('./src/phone/source-facts');
    return Promise.all(
      sourceFactFiles.map(async (filename) => {
        const content = await fs.readFile(`./src/phone/source-facts/${filename}`, 'utf-8');
        return {
          uuid: uuid(),
          text: content,
          metadata: {
            name: filename,
          },
        };
      }),
    );
  };
  return loadFromCache('./src/phone/facts', getOriginalFacts);
};

const getQuestions = async (sendRequestSkill: SendRequestSkill) => {
  return await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/phone_questions.json`,
  );
};

const identifySpeakers = async (
  conversations: Document[],
  facts: Document[],
  langfuseService: LangfuseService,
  openAIService: OpenAISkill,
) => {
  const getSpeakers = async () => {
    const identifySpeakersPrompt = await langfuseService.getPrompt('identify-speakers');
    const [identifySpeakersPromptMessage] = identifySpeakersPrompt.compile({
      context: facts.map((f) => `<fact name="${f.metadata.name}">${f.text}</fact>`).join('\n'),
    });

    const conversationsContent = conversations
      .map((c) => `<${c.metadata.name}>${c.text}\n</${c.metadata.name}>`)
      .join('\n');
    const speakersResponse = await openAIService.completionFull(
      [
        identifySpeakersPromptMessage as never,
        {
          role: 'user',
          content: conversationsContent,
        },
      ],
      'gpt-4o',
    );

    const speakersAnswer = speakersResponse.choices[0].message.content;
    const finalAnswer = speakersAnswer?.match(/<final_answer>(.*?)<\/final_answer>/s)?.[1].trim();
    const identifiedConversations = [];
    for (let i = 0; i < conversations.length; i++) {
      const identifiedConversation = finalAnswer
        ?.match(new RegExp(`<rozmowa${i + 1}>(.*?)</rozmowa${i + 1}>`, 's'))?.[1]
        .trim();
      identifiedConversations.push({
        uuid: uuid(),
        text: identifiedConversation!,
        metadata: {
          name: `rozmowa${i + 1}`,
        },
      });
    }

    return identifiedConversations;
  };

  return await loadFromCache('./src/phone/speakers', getSpeakers);
};

const submitAnswers = async (answers: object, answerCandidate: object, sendRequestSkill: SendRequestSkill) => {
  return await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'phone',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: {
      ...{ '01': '', '02': '', '03': '', '04': '', '05': '', '06': '' },
      ...answers,
      ...answerCandidate,
    },
  });
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
  const openAIService = new OpenAISkill(process.env.OPENAI_API_KEY);

  const anonymousConversations = await getConversations(sendRequestSkill);
  console.log('Anonymous conversations:', anonymousConversations);

  const facts = await loadFacts();
  console.log('Facts:', facts);

  const questions = await getQuestions(sendRequestSkill);
  console.log('Questions:', questions);

  const conversations = await identifySpeakers(anonymousConversations, facts, langfuseService, openAIService);
  console.log('Conversations:', conversations);

  const agent = new AgentService(openAIService, langfuseService);
  const state: State = {
    // TODO: Add call API tool
    tools: [
      {
        uuid: uuid(),
        name: 'final_answer',
        description: 'Use this tool to write a message to the user',
        instruction: '...',
        parameters: JSON.stringify({}),
      },
    ],
    config: {
      max_steps: 5,
      current_step: 0,
    },
  };
  const answers = {};
  for (const [questionId, question] of Object.entries(questions)) {
    console.log(`❓ Starting to answer question: ${question}`);

    for (; state.config.current_step < state.config.max_steps; state.config.current_step++) {
      console.log(`🤔 Planning...`);
      const nextMove = await agent.plan(
        [{ role: 'user', content: `Answer the following question based on facts and conversations: ${question}` }],
        state.tools,
        facts,
        conversations,
      );
      console.log('➡️ Next move:', nextMove);
      if (!nextMove.tool) {
        break;
      }

      if (nextMove.tool === 'final_answer') {
        const finalAnswer = await agent.generateAnswer(
          [{ role: 'user', content: question as string }],
          facts,
          conversations,
          nextMove.query,
        );
        console.log(`💡 Final answer: `, finalAnswer);
        const checkAnswerResponse = await submitAnswers(
          answers,
          { [questionId]: finalAnswer.answer },
          sendRequestSkill,
        );
        console.log(`👀 Check answer: `, checkAnswerResponse);
        // TODO: Handle wrong answer (add it to context)
        // TODO: Handle correct answer (add it to context)
        break;
      }
    }
    break;
  }

  // TODO: Report complete answer
};

main();
