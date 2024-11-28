import FirecrawlApp from '@mendable/firecrawl-js';

import { AppError } from '../../errors';

type AllowedDomain = {
  name: string;
  url: string;
};

export class ScrapeWebSkill {
  private readonly firecrawlApp: FirecrawlApp;

  constructor(
    private readonly crawlerApiKey: string,
    private readonly allowedDomains: AllowedDomain[],
  ) {
    this.firecrawlApp = new FirecrawlApp({ apiKey: crawlerApiKey });
  }

  private isUrlAllowed(url: string): boolean {
    return this.allowedDomains.some((domain) => url.startsWith(domain.url));
  }

  async scrapeUrl(
    url: string,
    formats: ('markdown' | 'html')[] = ['markdown'],
    onlyMainContent = true,
  ): Promise<{ markdown: string; html: string }> {
    if (!this.isUrlAllowed(url)) {
      throw new Error(`URL not in the list of allowed domains. ${JSON.stringify({ url })}`);
    }

    const scrapeResult = await this.firecrawlApp.scrapeUrl(url, { formats, onlyMainContent });

    if (scrapeResult.success) {
      return { markdown: scrapeResult.markdown || '', html: scrapeResult.html || '' };
    } else {
      throw new AppError('Failed to scrape URL', { url, error: scrapeResult.error });
    }
  }
}
