import FirecrawlApp from '@mendable/firecrawl-js';

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

    try {
      const scrapeResult = await this.firecrawlApp.scrapeUrl(url, { formats: ['markdown'] });

      if (scrapeResult.success) {
        return scrapeResult.markdown || '';
      } else {
        throw new Error(`Failed to scrape URL ${JSON.stringify({ url, error: scrapeResult.error })}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to scrape URL ${JSON.stringify({ url, error: error.message })}`);
      } else {
        throw new Error(`Failed to scrape URL ${JSON.stringify({ url, error: String(error) })}`);
      }
    }
  }
}
