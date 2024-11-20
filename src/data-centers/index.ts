import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

// TODO: Send report to headquarters

const fetchTableStructure = async (tableName: string) => {
  const sendRequestSkill = new SendRequestSkill();
  const fetchTableStructureResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/apidb', {
    task: 'database',
    apikey: process.env.AI_DEVS_API_KEY,
    query: `SHOW CREATE TABLE ${tableName}`,
  });

  return (fetchTableStructureResponse.reply as Array<Record<string, string>>)[0];
};

const prepareQuery = async (tables: string[]) => {
  console.log(tables);
  const langfuseService = new LangfuseService(
    process.env.LANGFUSE_PUBLIC_KEY ?? '',
    process.env.LANGFUSE_SECRET_KEY ?? '',
  );
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY ?? '');

  const sqlExpertPrompt = await langfuseService.getPrompt('data-centers-sql-expert');
  const [sqlExpertSystemMessage] = sqlExpertPrompt.compile({ tables: tables.join('\n\n') });
  const response = await openAiSkill.completionFull(
    [
      sqlExpertSystemMessage as never,
      {
        role: 'user',
        content: 'które aktywne datacenter (DC_ID) są zarządzane przez pracowników, którzy są na urlopie (is_active=0)',
      },
    ],
    'gpt-4o',
  );

  return response.choices[0].message.content ?? '';
};

const sendQuery = async (query: string) => {
  const sendRequestSkill = new SendRequestSkill();
  const queryResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/apidb', {
    task: 'database',
    apikey: process.env.AI_DEVS_API_KEY,
    query,
  });
  return queryResponse.reply;
};

const main = async () => {
  const usersTable = await fetchTableStructure('users');
  console.log(usersTable);

  const dataCentersTable = await fetchTableStructure('datacenters');
  console.log(dataCentersTable);

  const query = await prepareQuery([usersTable['Create Table'], dataCentersTable['Create Table']] as string[]);
  console.log(query);

  const queryResponse = await sendQuery(query);
  console.log(queryResponse);

  const report = (queryResponse as Array<Record<string, string>>).map((row) => row.dc_id);
  console.log(report);

  const sendRequestSkill = new SendRequestSkill();
  const reportResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'database',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: report,
  });
  console.log(reportResponse);
};

main();
