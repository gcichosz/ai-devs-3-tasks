import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Add HTTP headers handling for additional information
// TODO: Add Llama skill
// TODO: Send censorship request to Llama skill (replace sensitive data with "CENZURA"):
//       - first name and last name
//       - age
//       - city
//       - street name and number
// TODO: Ensure preservation of all punctuation and spacing
// TODO: Implement sending censored data to centrala.ag3nts.org/report

const censor = async () => {
  const sendRequestSkill = new SendRequestSkill();
  const sensitiveData = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/cenzura.txt`,
  );
  console.log(sensitiveData);
};

censor();
