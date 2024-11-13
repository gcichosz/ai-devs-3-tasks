import OpenAI from 'openai';

export class ImageGenerationSkill {
  private openai: OpenAI;

  constructor(private readonly openAiApiKey: string) {
    this.openai = new OpenAI({ apiKey: openAiApiKey });
  }

  async generateImage(prompt: string) {
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    return response.data[0].url;
  }
}
