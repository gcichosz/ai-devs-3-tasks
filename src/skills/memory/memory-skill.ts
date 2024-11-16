import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { OpenAISkill } from '../open-ai/open-ai-skill';
import { VectorStore } from './vector-store';

export class MemorySkill {
  private readonly memoryDir: string;
  private readonly openAiService: OpenAISkill;
  private readonly vectorStore: VectorStore;

  constructor(baseDir: string, openAiApiKey: string) {
    this.memoryDir = `${baseDir}/memories`;
    this.openAiService = new OpenAISkill(openAiApiKey);
    this.vectorStore = new VectorStore(3072, baseDir);
  }

  async learn(note: string) {
    const uuid = uuidv4();
    await fs.writeFile(`${this.memoryDir}/${uuid}.md`, note);
    const embedding = await this.openAiService.createEmbedding(note);
    this.vectorStore.add(embedding, uuid);
  }

  async recallSimilar(embedding: number[]): Promise<string> {
    const memoryIds = await this.vectorStore.search(embedding);
    const memoryPromises = memoryIds.map(async (id) => {
      const memory = await fs.readFile(`${this.memoryDir}/${id}.md`, 'utf-8');
      return memory;
    });
    const memories = await Promise.all(memoryPromises);
    return memories.join('\n');
  }

  async recallAll(): Promise<void> {
    await this.vectorStore.load();
  }

  async forgetAll() {
    await fs.rm(this.memoryDir, { recursive: true, force: true });
    await fs.mkdir(this.memoryDir, { recursive: true });
    await this.vectorStore.clear();
  }
}
