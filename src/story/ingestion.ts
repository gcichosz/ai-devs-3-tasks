import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { SpeechToTextSkill } from '../skills/speech-to-text/speech-to-text-skill';
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
  const chapters = markdown.split('## ').filter((c) => c.length > 0);
  const docs = chapters.map((chapter) => ({
    uuid: uuidv4(),
    text: chapter,
    metadata: {
      type: 'blog_rafala',
    },
  }));
  // console.log('🪓 Splitting blog');
  // const docs = await textSplitter.split(markdown, 1000, 'blog_rafala');
  // console.log('🪓 Blog splitted');
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

const ingestArticle = async (
  scrapeWebSkill: ScrapeWebSkill,
  openAiSkill: OpenAISkill,
  qdrantService: QdrantService,
) => {
  console.log('🔍 Scraping article');
  const { markdown } = await scrapeWebSkill.scrapeUrl('https://centrala.ag3nts.org/dane/arxiv-draft.html');
  console.log('🔍 Scraped article');
  const chapters = markdown.split('## ').filter((c) => c.length > 0);
  const docs = chapters.map((chapter) => ({
    uuid: uuidv4(),
    text: chapter,
    metadata: {
      type: 'time_travel_and_llm_whitepaper',
    },
  }));
  await Promise.all(
    docs.map(async (doc) => {
      await saveDocument(doc, openAiSkill, qdrantService);
    }),
  );
};

const ingestInterrogations = async (
  speechToTextSkill: SpeechToTextSkill,
  openAiSkill: OpenAISkill,
  qdrantService: QdrantService,
) => {
  const interrogationsDir = './src/story/interrogations/';
  const interrogations = await fs.readdir(interrogationsDir);
  await Promise.all(
    interrogations.map(async (interrogation) => {
      console.log(`🎙️ Transcribing interrogation: ${interrogation}`);
      const audio = await fs.readFile(path.join(interrogationsDir, interrogation));
      const transcription = await speechToTextSkill.transcribe(audio);
      console.log(`🎙️ Transcribed interrogation: ${interrogation}`, transcription);
      const document = {
        uuid: uuidv4(),
        text: `${interrogation.slice(0, -4)}: ${transcription}`,
        metadata: {
          type: `przesluchanie`,
        },
      };
      await saveDocument(document, openAiSkill, qdrantService);
    }),
  );
};

const ingestPhoneCalls = async (openAiSkill: OpenAISkill, qdrantService: QdrantService) => {
  const phoneCallsDir = './src/story/phone/';
  const phoneCalls = await fs.readdir(phoneCallsDir);
  await Promise.all(
    phoneCalls.map(async (phoneCall) => {
      const phoneCallContent = await fs.readFile(path.join(phoneCallsDir, phoneCall), 'utf-8');
      const phoneCallData = JSON.parse(phoneCallContent);
      const document = {
        uuid: uuidv4(),
        text: phoneCallData.text,
        metadata: {
          type: `phone_call`,
        },
      };
      await saveDocument(document, openAiSkill, qdrantService);
    }),
  );
};

const ingestFacts = async (openAiSkill: OpenAISkill, qdrantService: QdrantService) => {
  const factsDir = './src/story/facts/';
  const facts = await fs.readdir(factsDir);
  await Promise.all(
    facts.map(async (fact) => {
      const factData = await fs.readFile(path.join(factsDir, fact), 'utf-8');
      const document = {
        uuid: uuidv4(),
        text: factData,
        metadata: {
          type: `fact`,
        },
      };
      await saveDocument(document, openAiSkill, qdrantService);
    }),
  );
};

const ingestReports = async (
  openAiSkill: OpenAISkill,
  qdrantService: QdrantService,
  speechToTextSkill: SpeechToTextSkill,
  imageManipulationSkill: ImageManipulationSkill,
) => {
  const reportsDir = './src/story/reports/';
  const reports = await fs.readdir(reportsDir);
  await Promise.all(
    reports.map(async (report) => {
      const extension = report.split('.').pop();

      if (extension === 'txt') {
        const reportData = await fs.readFile(path.join(reportsDir, report), 'utf-8');
        const document = {
          uuid: uuidv4(),
          text: `${report.split('.')[0]}: ${reportData}`,
          metadata: {
            type: `report`,
          },
        };
        await saveDocument(document, openAiSkill, qdrantService);
        return;
      }

      if (extension === 'mp3') {
        console.log(`🎙️ Transcribing report: ${report}`);
        const audio = await fs.readFile(path.join(reportsDir, report));
        const transcription = await speechToTextSkill.transcribe(audio);
        console.log(`🎙️ Transcribed report: ${report}`, transcription);
        const document = {
          uuid: uuidv4(),
          text: `${report.split('.')[0]}: ${transcription}`,
          metadata: {
            type: `report`,
          },
        };
        await saveDocument(document, openAiSkill, qdrantService);
        return;
      }

      if (extension === 'png') {
        const base64 = await imageManipulationSkill.prepareImageFromPath(reportsDir + report);
        console.log(`✍️ Transcribing ${report}`);
        const transcription = await openAiSkill.vision(
          {
            role: 'system',
            content:
              'Transcribe the text from the repair note below. The text is in Polish. Ignore headers and footers, transcribe just the main content.',
          },
          [base64],
        );
        console.log(`✍️ Transcribed ${report}`, transcription);
        const document = {
          uuid: uuidv4(),
          text: `${report.split('.')[0]}: ${transcription}`,
          metadata: {
            type: 'report',
          },
        };
        await saveDocument(document, openAiSkill, qdrantService);
      }
    }),
  );
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
    {
      name: 'arxiv',
      url: 'https://centrala.ag3nts.org/',
    },
  ]);
  const textSplitter = new TextSplitter();
  await textSplitter.initializeTokenizer();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY!);
  const imageManipulationSkill = new ImageManipulationSkill();
  const speechToTextSkill = new SpeechToTextSkill(process.env.GROQ_API_KEY!);

  await qdrantService.createCollection(QDRANT_COLLECTION, 3072);

  await ingestBlog(scrapeWebSkill, textSplitter, openAiSkill, qdrantService);
  await ingestNotes(imageManipulationSkill, openAiSkill, qdrantService);
  await ingestWebsite(scrapeWebSkill, openAiSkill, qdrantService);
  await ingestArticle(scrapeWebSkill, openAiSkill, qdrantService);
  await ingestInterrogations(speechToTextSkill, openAiSkill, qdrantService);
  await ingestPhoneCalls(openAiSkill, qdrantService);
  await ingestFacts(openAiSkill, qdrantService);
  await ingestReports(openAiSkill, qdrantService, speechToTextSkill, imageManipulationSkill);
};

ingest();
