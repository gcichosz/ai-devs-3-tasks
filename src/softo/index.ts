import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Scrape main(?) page
// TODO: Try answering questions based on the scraped page
// TODO: Pick best link to follow (rank potential links)
// TODO: Add visited links tracking
// TODO: Save visited links summary and their links

const fetchQuestions = async (sendRequestSkill: SendRequestSkill) => {
  return await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/softo.json`,
  );
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  const questions = await fetchQuestions(sendRequestSkill);
  console.log(questions);
};

main();
