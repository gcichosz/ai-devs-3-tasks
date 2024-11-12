import { Langfuse, TextPromptClient } from 'langfuse';

export class LangfuseService {
  private readonly langfuse: Langfuse;

  constructor(
    private readonly publicKey: string,
    private readonly secretKey: string,
  ) {
    this.langfuse = new Langfuse({ publicKey, secretKey, baseUrl: 'https://cloud.langfuse.com' });
  }

  async getPrompt(promptName: string): Promise<TextPromptClient> {
    return await this.langfuse.getPrompt(promptName);
  }
}
