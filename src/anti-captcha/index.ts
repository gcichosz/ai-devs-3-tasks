import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai';
import { PostFormSkill } from '../skills/post-form';
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
  const postFormSkill = new PostFormSkill();

  try {
    const webPageContent = await webScraper.scrapeUrl('https://xyz.ag3nts.org', ['markdown', 'html']);
    console.log('Scraped content:', webPageContent.markdown);
    console.log('Scraped content:', webPageContent.html);

    const lines = webPageContent.markdown.split('\n');
    const question = lines.filter((line) => line.trim().endsWith('?'))?.[0];
    console.log('Extracted questions:', question);

    const completion = await openAi.completion([{ role: 'system', content: yearSearchPrompt }, { role: 'user', content: webPageContent.markdown }], 'gpt-4o-mini');
    const year = (completion).choices[0].message.content;
    console.log('OpenAI completion:', year);

    const formFields = {
      username: 'tester',
      password: '574e112a',
      answer: year,
    }
    const captchaResponse = await postFormSkill.postForm('https://xyz.ag3nts.org/', formFields);
    console.log(captchaResponse.data);
    await fs.writeFile(`${__dirname}/src/anti-captcha/captcha.html`, captchaResponse.data);
  } catch (error) {
    console.error('Failed break anti-captcha:', error);
  }
  // TODO: Send answer to xyz.ag3nts.org (simulating browser login)
}

main();
