import { OpenAISkill } from '../skills/open-ai';
import { WebScrapeSkill } from '../skills/web-scrape';
import { yearSearchPrompt } from './prompts';

const ALLOWED_DOMAINS = [
  {
    name: 'agents',
    url: 'https://xyz.ag3nts.org',
  },
];

async function main() {
  const webScraper = new WebScrapeSkill(process.env.FIRECRAWL_API_KEY || '', ALLOWED_DOMAINS);
  const openAi = new OpenAISkill(process.env.OPENAI_API_KEY || '');

  try {
    const content = await webScraper.scrapeUrl('https://xyz.ag3nts.org');
    console.log('Scraped content:', content);

    const lines = content.split('\n');
    const question = lines.filter((line) => line.trim().endsWith('?'))?.[0];
    console.log('Extracted questions:', question);

    const completion = await openAi.completion([{ role: 'system', content: yearSearchPrompt }, { role: 'user', content }], 'gpt-4o-mini');
    console.log('OpenAI completion:', (completion).choices[0].message.content);
  } catch (error) {
    console.error('Failed break anti-captcha:', error);
  }
  // TODO: Send answer to xyz.ag3nts.org (simulating browser login)
}

main();
