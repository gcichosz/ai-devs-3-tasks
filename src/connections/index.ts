import { promises as fs } from 'fs';

import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Build a graph of users and connections
// TODO: Get the shortest path between two users (Rafał and Barbara)
// TODO: Report result

interface User {
  id: string;
  username: string;
  access_level: string;
  is_active: string;
  lastlog: string;
}

const fetchTableData = async (table: string, sendRequestSkill: SendRequestSkill) => {
  const fetchTableDataResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/apidb', {
    task: 'database',
    apikey: process.env.AI_DEVS_API_KEY,
    query: `SELECT * FROM ${table}`,
  });

  console.log(fetchTableDataResponse);
  return fetchTableDataResponse.reply as User[];
};

const cacheTable = async (table: string, users: unknown) => {
  await fs.writeFile(`./src/connections/${table}.json`, JSON.stringify(users, null, 2));
};

const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  let users;
  try {
    const usersCache = await fs.readFile('./src/connections/users.json', 'utf-8');
    users = JSON.parse(usersCache);
  } catch {
    users = await fetchTableData('users', sendRequestSkill);
    await cacheTable('users', users);
  }

  let connections;
  try {
    const connectionsCache = await fs.readFile('./src/connections/connections.json', 'utf-8');
    connections = JSON.parse(connectionsCache);
  } catch {
    connections = await fetchTableData('connections', sendRequestSkill);
    await cacheTable('connections', connections);
  }
};

main();
