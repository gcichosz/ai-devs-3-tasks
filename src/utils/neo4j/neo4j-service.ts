import neo4j, { Driver, Integer, Result, Session } from 'neo4j-driver';

export class Neo4jService {
  private readonly driver: Driver;

  constructor(uri: string, username: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async runQuery(cypher: string, params: Record<string, unknown> = {}): Promise<Result> {
    const session: Session = this.driver.session();
    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  async addNode(label: string, properties: Record<string, unknown>) {
    const cypher = `CREATE (n:${label} $properties)`;
    await this.runQuery(cypher, { properties });
  }

  async findNodeByProperty(
    label: string,
    propertyName: string,
    propertyValue: unknown,
  ): Promise<{ id: number } | null> {
    const cypher = `
      MATCH (n:${label} {${propertyName}: $propertyValue})
      RETURN id(n) AS id
    `;
    const result = await this.runQuery(cypher, { propertyValue });
    if (result.records.length === 0) {
      return null;
    }
    const record = result.records[0];
    return {
      id: (record.get('id') as Integer).toNumber(),
    };
  }

  async connectNodes(
    fromNodeId: number,
    toNodeId: number,
    relationshipType: string,
    properties: Record<string, unknown> = {},
  ): Promise<void> {
    const cypher = `
      MATCH (a), (b)
      WHERE id(a) = $fromNodeId AND id(b) = $toNodeId
      CREATE (a)-[r:${relationshipType} $properties]->(b)
      RETURN r
    `;
    await this.runQuery(cypher, {
      fromNodeId: neo4j.int(fromNodeId),
      toNodeId: neo4j.int(toNodeId),
      properties,
    });
  }
}
