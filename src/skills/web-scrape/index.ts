import FirecrawlApp from '@mendable/firecrawl-js';

import { AppError } from '../../errors';

type AllowedDomain = {
  name: string;
  url: string;
};

export class WebScrapeSkill {
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

  async scrapeUrl(url: string): Promise<string> {
    if (!this.isUrlAllowed(url)) {
      throw new Error(`URL not in the list of allowed domains. ${JSON.stringify({ url })}`);
    }

    const scrapeResult = await this.firecrawlApp.scrapeUrl(url, { formats: ['markdown'] });

    if (scrapeResult.success) {
      return scrapeResult.markdown || '';
    } else {
      throw new AppError('Failed to scrape URL', { url, error: scrapeResult.error });
    }
  }
}
