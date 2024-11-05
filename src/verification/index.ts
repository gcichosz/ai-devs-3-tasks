import { SendRequestSkill } from '../skills/send-request';

async function verify() {
  const sendRequestSkill = new SendRequestSkill();
  const { msgID, text: question } = await sendRequestSkill.postRequest('https://xyz.ag3nts.org/verify', {
    text: 'READY',
    msgID: '0',
  });
  console.log({ msgID, question });

  // TODO: Get answer to verification question from LLM
  // TODO: Send answer to https://xyz.ag3nts.org/verify
  // TODO: Add memory (relevant context) to the LLM system message
}

verify();
