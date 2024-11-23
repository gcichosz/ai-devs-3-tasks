import neo4j, { Driver } from 'neo4j-driver';

export class Neo4jService {
  private readonly driver: Driver;

  constructor(uri: string, username: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
}
