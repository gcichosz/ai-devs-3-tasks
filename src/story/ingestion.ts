import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { QdrantService } from '../utils/qdrant/qdrant-service';
import { TextSplitter } from './text-splitter';
import { Document } from './types';

const QDRANT_COLLECTION = 'story';

const saveDocument = async (doc: Document, openAiSkill: OpenAISkill, qdrantService: QdrantService) => {
  console.log('📜 Creating embedding for', doc.uuid);
  const embedding = await openAiSkill.createEmbedding(`type: ${doc.metadata.type}\n---\n${doc.text}`);
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
};

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
  const docs = await textSplitter.split(markdown, 1000, 'blog_rafala');
  console.log('🪓 Blog splitted');
  await Promise.all(
    docs.map(async (doc) => {
      await saveDocument(doc, openAiSkill, qdrantService);
    }),
  );
};

const ingestNotes = async (
  imageManipulationSkill: ImageManipulationSkill,
  openAiSkill: OpenAISkill,
  qdrantService: QdrantService,
) => {
  const notesDir = './src/story/notes/';
  const notes = await fs.readdir(notesDir);
  await Promise.all(
    notes.map(async (note) => {
      const base64 = await imageManipulationSkill.prepareImageFromPath(notesDir + note);
      console.log(`✍️ Transcribing ${note}`);
      const transcription = await openAiSkill.vision(
        {
          role: 'system',
          content: 'Transcribe the text from the image below. The text is in Polish. Ignore "Al_devs 3 AGENTS" text',
        },
        [base64],
      );
      console.log(`✍️ Transcribed ${note}`, transcription);
      const document = {
        uuid: uuidv4(),
        text: transcription,
        metadata: {
          type: 'notatka_zygfryda',
        },
      };
      await saveDocument(document, openAiSkill, qdrantService);
    }),
  );
};

const ingestWebsite = async (
  scrapeWebSkill: ScrapeWebSkill,
  openAiSkill: OpenAISkill,
  qdrantService: QdrantService,
) => {
  const pages = [
    'https://softo.ag3nts.org/',
    'https://softo.ag3nts.org/uslugi',
    'https://softo.ag3nts.org/portfolio',
    'https://softo.ag3nts.org/portfolio_1_c4ca4238a0b923820dcc509a6f75849b',
    'https://softo.ag3nts.org/portfolio_2_c81e728d9d4c2f636f067f89cc14862c',
    'https://softo.ag3nts.org/portfolio_3_eccbc87e4b5ce2fe28308fd9f2a7baf3',
    'https://softo.ag3nts.org/portfolio_4_a87ff679a2f3e71d9181a67b7542122c',
    'https://softo.ag3nts.org/portfolio_6_1679091c5a880faf6fb5e6087eb1b2dc',
    'https://softo.ag3nts.org/aktualnosci',
    'https://softo.ag3nts.org/blog/automatyzacja-procesow',
    'https://softo.ag3nts.org/blog/sukcesy-softoai',
    'https://softo.ag3nts.org/blog/nowe-modele-llm',
    'https://softo.ag3nts.org/kontakt',
  ];

  for (const page of pages) {
    console.log(`🔍 Scraping page: ${page}`);
    const { markdown } = await scrapeWebSkill.scrapeUrl(page);
    console.log(`🔍 Page scraped: ${page}`, markdown);
    const document = {
      uuid: uuidv4(),
      text: markdown,
      metadata: {
        type: 'strona_softo',
      },
    };
    await saveDocument(document, openAiSkill, qdrantService);
  }
};

const ingest = async () => {
  const qdrantService = new QdrantService(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);
  const scrapeWebSkill = new ScrapeWebSkill(process.env.FIRECRAWL_API_KEY!, [
    {
      name: 'blog',
      url: 'https://rafal.ag3nts.org/',
    },
    {
      name: 'softo',
      url: 'https://softo.ag3nts.org/',
    },
  ]);
  const textSplitter = new TextSplitter();
  await textSplitter.initializeTokenizer();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY!);
  const imageManipulationSkill = new ImageManipulationSkill();

  await qdrantService.createCollection(QDRANT_COLLECTION, 3072);

  await ingestBlog(scrapeWebSkill, textSplitter, openAiSkill, qdrantService);
  await ingestNotes(imageManipulationSkill, openAiSkill, qdrantService);
  await ingestWebsite(scrapeWebSkill, openAiSkill, qdrantService);
};

ingest();
