import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private readonly qdrantClient: QdrantClient;

  constructor(url: string, apiKey: string) {
    this.qdrantClient = new QdrantClient({
      url,
      apiKey,
    });
  }

  async createCollection(collectionName: string, vectorSize: number = 3072, fromScratch: boolean = false) {
    const collections = await this.qdrantClient.getCollections();
    const collectionExists = collections.collections.some((c) => c.name === collectionName);

    if (fromScratch && collectionExists) {
      await this.qdrantClient.deleteCollection(collectionName);
      await this.qdrantClient.createCollection(collectionName, { vectors: { size: vectorSize, distance: 'Cosine' } });
    } else if (!collectionExists) {
      await this.qdrantClient.createCollection(collectionName, { vectors: { size: vectorSize, distance: 'Cosine' } });
    }
  }

  async upsert(collectionName: string, points: { id: string; vector: number[]; payload: Record<string, unknown> }[]) {
    await this.qdrantClient.upsert(collectionName, { wait: true, points });
  }

  async search(collectionName: string, vector: number[], limit: number = 10) {
    const results = await this.qdrantClient.search(collectionName, { vector, limit });
    return results;
  }
}
