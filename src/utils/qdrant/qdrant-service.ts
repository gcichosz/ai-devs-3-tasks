import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private readonly qdrantClient: QdrantClient;

  constructor(url: string, apiKey: string) {
    this.qdrantClient = new QdrantClient({
      url,
      apiKey,
    });
  }

  async createCollection(collectionName: string, vectorSize: number = 3072) {
    const collections = await this.qdrantClient.getCollections();
    if (collections.collections.some((c) => c.name === collectionName)) {
      await this.qdrantClient.deleteCollection(collectionName);
    }

    await this.qdrantClient.createCollection(collectionName, { vectors: { size: vectorSize, distance: 'Cosine' } });
  }

  async upsert(collectionName: string, points: { id: string; vector: number[]; payload: Record<string, unknown> }[]) {
    await this.qdrantClient.upsert(collectionName, { wait: true, points });
  }
}
