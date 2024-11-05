import { OpenAISkill } from '../skills/open-ai';
import { SendRequestSkill } from '../skills/send-request';

async function verify() {
  const sendRequestSkill = new SendRequestSkill();
  const openAISkill = new OpenAISkill(process.env.OPENAI_API_KEY || '');

  const { msgID, text: question } = await sendRequestSkill.postRequest('https://xyz.ag3nts.org/verify', {
    text: 'READY',
    msgID: '0',
  });
  console.log({ msgID, question });

  const completion = await openAISkill.completionFull([
    { role: 'system', content: 'You are a helpful assistant. Please answer the question directly and concisely.' },
    { role: 'user', content: question as string },
  ]);

  const answer = completion.choices[0].message.content;
  console.log({ answer });

  // TODO: Add memory (relevant context) to the LLM system message
  // TODO: Send answer to https://xyz.ag3nts.org/verify
}

verify();
