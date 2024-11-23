import { promises as fs } from 'fs';

import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { Neo4jService } from '../utils/neo4j/neo4j-service';

// TODO: Get the shortest path between two users (Rafał and Barbara)
// TODO: Report result

type User = {
  id: string;
  username: string;
  access_level: string;
  is_active: string;
  lastlog: string;
};

type Connection = {
  user1_id: string;
  user2_id: string;
};

const fetchTableData = async <T>(table: string, sendRequestSkill: SendRequestSkill): Promise<T[]> => {
  const fetchTableDataResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/apidb', {
    task: 'database',
    apikey: process.env.AI_DEVS_API_KEY,
    query: `SELECT * FROM ${table}`,
  });

  console.log(fetchTableDataResponse);
  return fetchTableDataResponse.reply as T[];
};

const cacheTable = async (table: string, users: unknown) => {
  await fs.writeFile(`./src/connections/${table}.json`, JSON.stringify(users, null, 2));
};

const saveUsersInGraph = async (users: User[], neo4jService: Neo4jService) => {
  for (const user of users) {
    console.log('Saving user: ', user.username);
    await neo4jService.addNode('User', user);
  }
};

const saveConnectionsInGraph = async (connections: Connection[], neo4jService: Neo4jService) => {
  for (const connection of connections) {
    console.log(`Saving connection: ${connection.user1_id} -> ${connection.user2_id}`);

    const [user1, user2] = await Promise.all([
      neo4jService.findNodeByProperty('User', 'id', connection.user1_id),
      neo4jService.findNodeByProperty('User', 'id', connection.user2_id),
    ]);
    if (!user1 || !user2) {
      throw new Error(`User not found: ${!user1 ? connection.user1_id : connection.user2_id}`);
    }

    await neo4jService.connectNodes(user1.id, user2.id, 'Knows');
  }
};

const neo4jService = new Neo4jService(process.env.NEO4J_URI, process.env.NEO4J_USER, process.env.NEO4J_PASSWORD);
const main = async () => {
  const sendRequestSkill = new SendRequestSkill();

  let users;
  try {
    const usersCache = await fs.readFile('./src/connections/users.json', 'utf-8');
    users = JSON.parse(usersCache);
  } catch {
    users = await fetchTableData<User>('users', sendRequestSkill);
    await cacheTable('users', users);
  }
  console.log(users);

  let connections;
  try {
    const connectionsCache = await fs.readFile('./src/connections/connections.json', 'utf-8');
    connections = JSON.parse(connectionsCache);
  } catch {
    connections = await fetchTableData<Connection>('connections', sendRequestSkill);
    await cacheTable('connections', connections);
  }
  console.log(connections);

  await saveUsersInGraph(users, neo4jService);
  await saveConnectionsInGraph(connections, neo4jService);
};

main()
  .then(() => neo4jService.close())
  .catch(() => neo4jService.close());
