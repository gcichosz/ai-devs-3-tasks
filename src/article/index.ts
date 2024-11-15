import { promises as fs } from 'fs';

import { ScrapeWebSkill } from '../skills/scrape-web/scrape-web-skill';

// TODO: Index text from the article
// TODO: Index images from the article
// TODO: Add context to the images
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

const getArticle = async () => {
  const scrapeWebSkill = new ScrapeWebSkill(process.env.FIRECRAWL_API_KEY, ALLOWED_DOMAINS);

  if (await fs.exists('./src/article/article.md')) {
    const existingArticle = await fs.readFile('./src/article/article.md', 'utf-8');
    return existingArticle;
  }

  const response = await scrapeWebSkill.scrapeUrl('https://centrala.ag3nts.org/dane/arxiv-draft.html');
  await fs.writeFile('./src/article/article.md', response.markdown);
  return response.markdown;
};

const main = async () => {
  const article = await getArticle();
  console.log(article);
};

main();
