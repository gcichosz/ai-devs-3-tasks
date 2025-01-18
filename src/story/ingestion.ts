import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { QdrantService } from '../utils/qdrant/qdrant-service';
import { TextSplitter } from './text-splitter';

const QDRANT_COLLECTION = 'story';

const ingestBlog = async (
  scrapeWebSkill: ScrapeWebSkill,
  textSplitter: TextSplitter,
  openAiSkill: OpenAISkill,
  qdrantService: QdrantService,
) => {
  console.log('🔍 Scraping blog');
  const { markdown } = await scrapeWebSkill.scrapeUrl('https://rafal.ag3nts.org/blogXYZ/');
  console.log('🔍 Blog scraped');
  console.log('🪓 Splitting blog');
  const docs = await textSplitter.split(markdown, 1000);
  console.log('🪓 Blog split');
  for (const doc of docs) {
    console.log('📜 Creating embedding for', doc.uuid);
    const embedding = await openAiSkill.createEmbedding(doc.text);
    console.log('📜 Embedding created for', doc.uuid);
    console.log('💾 Saving ', doc.uuid);
    await qdrantService.upsert(QDRANT_COLLECTION, [
      {
        id: doc.uuid,
        vector: embedding,
        payload: {
          text: doc.text,
          ...doc.metadata,
        },
      },
    ]);
    console.log('💾 Saved ', doc.uuid);
  }
};

const ingest = async () => {
  const qdrantService = new QdrantService(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);
  const scrapeWebSkill = new ScrapeWebSkill(process.env.FIRECRAWL_API_KEY!, [
    {
      name: 'blog',
      url: 'https://rafal.ag3nts.org/',
    },
  ]);
  const textSplitter = new TextSplitter();
  await textSplitter.initializeTokenizer();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY!);

  await qdrantService.createCollection(QDRANT_COLLECTION, 3072, true);

  await ingestBlog(scrapeWebSkill, textSplitter, openAiSkill, qdrantService);
};

ingest();
