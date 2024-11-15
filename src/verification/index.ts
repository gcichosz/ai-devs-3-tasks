import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { answerQuestionWithContextPrompt } from './prompts';

async function verify() {
  const sendRequestSkill = new SendRequestSkill();
  const openAISkill = new OpenAISkill(process.env.OPENAI_API_KEY || '');

  const { msgID, text: question } = await sendRequestSkill.postRequest('https://xyz.ag3nts.org/verify', {
    text: 'READY',
    msgID: '0',
  });
  console.log({ msgID, question });

  // TODO: Add memory (relevant context) to the LLM system message
  const memory = [
    'stolicą Polski jest Kraków',
    'znana liczba z książki Autostopem przez Galaktykę to 69',
    'Aktualny rok to 1999',
  ];
  const relevantContext = memory.map((item) => `- ${item}`).join('\n');
  const prompt = answerQuestionWithContextPrompt.replace(
    '<relevant_context>\n</relevant_context>',
    `<relevant_context>\n${relevantContext}\n</relevant_context>`,
  );
  console.log(prompt);

  const completion = await openAISkill.completionFull([
    { role: 'system', content: prompt },
    { role: 'user', content: question as string },
  ]);

  const answer = completion.choices[0].message.content;
  console.log({ answer });

  const verificationResponse = await sendRequestSkill.postRequest('https://xyz.ag3nts.org/verify', {
    text: answer,
    msgID,
  });
  console.log({ response: verificationResponse });
}

verify();
