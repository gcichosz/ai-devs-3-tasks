import { IndexFlatIP } from 'faiss-node';
import { promises as fs } from 'fs';

export class VectorStore {
  private index: IndexFlatIP;
  private metadata: Map<number, string>;
  private indexPath: string;
  private metadataPath: string;
  private storagePath: string;

  constructor(dimension: number, baseDir: string) {
    this.index = new IndexFlatIP(dimension);
    this.metadata = new Map();
    this.storagePath = baseDir;
    this.indexPath = `${baseDir}/vector_index.faiss`;
    this.metadataPath = `${baseDir}/vector_metadata.json`;
  }

  async add(vector: number[], id: string): Promise<void> {
    const normalizedVector = this.normalizeVector(vector);
    const index = this.index.ntotal();
    this.index.add(normalizedVector);
    this.metadata.set(index, id);
    await this.save();
  }

  async search(vector: number[]): Promise<string[]> {
    const normalizedVector = this.normalizeVector(vector);
    const total = this.index.ntotal();
    if (total === 0) {
      return [];
    }
    const { labels } = this.index.search(normalizedVector, 3);
    return labels.map((label) => this.metadata.get(label) as string);
  }

  async load(): Promise<void> {
    this.index = IndexFlatIP.read(this.indexPath);
    const metadataContent = await fs.readFile(this.metadataPath, 'utf-8');
    this.metadata = new Map(JSON.parse(metadataContent));
  }

  async clear(): Promise<void> {
    await fs.rm(this.indexPath, { recursive: true, force: true });
    await fs.rm(this.metadataPath, { recursive: true, force: true });
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((val) => val / magnitude);
  }

  private async save(): Promise<void> {
    try {
      this.index.write(this.indexPath);
      await fs.writeFile(this.metadataPath, JSON.stringify(Array.from(this.metadata.entries())));
    } catch (error) {
      console.error('Error saving index and metadata:', error);
      throw error;
    }
  }
}
