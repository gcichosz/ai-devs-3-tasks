import { promises as fs } from 'fs';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { MemorySkill } from '../skills/memory/memory-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Index audio from the article
// TODO: Add context to the audio
// TODO: Get article questions
// TODO: Answer article questions using RAG prompt
// TODO: Report answers

const ALLOWED_DOMAINS = [
  {
    name: 'centrala',
    url: 'https://centrala.ag3nts.org',
  },
];
const ARTICLE_BASE_URL = 'https://centrala.ag3nts.org/dane';

const getArticle = async () => {
  const scrapeWebSkill = new ScrapeWebSkill(process.env.FIRECRAWL_API_KEY, ALLOWED_DOMAINS);

  if (await fs.exists('./src/article/article.md')) {
    const existingArticle = await fs.readFile('./src/article/article.md', 'utf-8');
    return existingArticle;
  }

  const response = await scrapeWebSkill.scrapeUrl(`${ARTICLE_BASE_URL}/arxiv-draft.html`);
  await fs.writeFile('./src/article/article.md', response.markdown);
  return response.markdown;
};

const expandParagraph = async (paragraph: string) => {
  const sendRequestSkill = new SendRequestSkill();
  const imageManipulationSkill = new ImageManipulationSkill();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const links = paragraph.match(/\[\S*\]\(\S*\)/g);
  if (!links) {
    return paragraph;
  }

  for (const link of links) {
    const filePath = link.match(/\((.*)\)/)?.[1];
    const fileExtension = filePath?.split('.').pop();

    if (fileExtension === 'png') {
      const imageBuffer = await sendRequestSkill.downloadFile(`${ARTICLE_BASE_URL}/${filePath}`);
      const image = await imageManipulationSkill.prepareImageFromBuffer(imageBuffer);
      const imageDescription = await openAiSkill.vision(
        'Twoim zadaniem jest zwięzłe opisanie obrazu w języku polskim.',
        image,
      );
      console.log(imageDescription);
      paragraph = paragraph.replace(link, imageDescription);
    }
  }
  return paragraph;
};

const memorize = async (notes: string[]) => {
  const memorySkill = new MemorySkill('./src/article', process.env.OPENAI_API_KEY);
  await memorySkill.forgetAll();

  const learnPromises = notes.map((note) => memorySkill.learn(note));
  await Promise.all(learnPromises);
};

const main = async () => {
  const article = await getArticle();
  // console.log(article);

  const pureParagraphs = article.split(/(?=##\s)/);
  // console.log(paragraphs);

  const expandedParagraphsPromises = pureParagraphs.map((paragraph) => expandParagraph(paragraph));
  const expandedParagraphs = await Promise.all(expandedParagraphsPromises);
  // console.log(expandedParagraphs);

  await memorize(expandedParagraphs);
};

main();
