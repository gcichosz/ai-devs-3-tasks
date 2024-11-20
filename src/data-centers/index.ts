import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Prepare SQL query to extract required data using an LLM
// TODO: Send response to headquarters

const fetchTableStructure = async (tableName: string) => {
  const sendRequestSkill = new SendRequestSkill();
  const fetchTableStructureResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/apidb', {
    task: 'database',
    apikey: process.env.AI_DEVS_API_KEY,
    query: `SHOW CREATE TABLE ${tableName}`,
  });

  return fetchTableStructureResponse;
};

const main = async () => {
  const usersTable = await fetchTableStructure('users');
  console.log(usersTable);

  const dataCentersTable = await fetchTableStructure('datacenters');
  console.log(dataCentersTable);
};

main();
