import { LlamaSkill } from '../skills/llama/llama-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { censorshipPrompt } from './prompts';

// TODO: Implement sending censored data to centrala.ag3nts.org/report

const censor = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const llamaSkill = new LlamaSkill();

  const sensitiveData = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/cenzura.txt`,
  );
  console.log(sensitiveData);

  // const censoredData = await llamaSkill.completionFullLocal('llama2:7b', censorshipPrompt, sensitiveData);
  const censoredData = await llamaSkill.completionFullRemote(
    '@cf/meta/llama-2-7b-chat-int8',
    censorshipPrompt,
    sensitiveData,
  );
  console.log(censoredData);
};

censor();
