import { WebScrapeSkill } from '../skills/web-scrape';

const ALLOWED_DOMAINS = [
  {
    name: 'agents',
    url: 'https://xyz.ag3nts.org',
  },
];

async function main() {
  const webScraper = new WebScrapeSkill(process.env.FIRECRAWL_API_KEY || '', ALLOWED_DOMAINS);

  try {
    const content = await webScraper.scrapeUrl('https://xyz.ag3nts.org');
    console.log('Scraped content:', content);

    const lines = content.split('\n');
    const question = lines.filter((line) => line.trim().endsWith('?'))?.[0];
    console.log('Extracted questions:', question);
  } catch (error) {
    console.error('Failed break anti-captcha:', error);
  }
  // TODO: Send question to LLM
  // TODO: Send answer to xyz.ag3nts.org (simulating browser login)
}

main();
