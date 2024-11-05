import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

import { AppError } from '../../errors';

export class OpenAISkill {
  private openai: OpenAI;

  constructor(private readonly openAiApiKey: string) {
    this.openai = new OpenAI({ apiKey: openAiApiKey });
  }

  private async completion(
    messages: ChatCompletionMessageParam[],
    model: string = 'gpt-4',
    stream: boolean = false,
    jsonMode: boolean = false,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        stream,
        response_format: jsonMode ? { type: 'json_object' } : { type: 'text' },
      });

      if (stream) {
        return chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      } else {
        return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
      }
    } catch (error) {
      throw new AppError('Error in OpenAI completion', { error });
    }
  }
  async completionFull(
    messages: ChatCompletionMessageParam[],
    model: string = 'gpt-4o-mini',
    jsonMode: boolean = false,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    return (await this.completion(messages, model, false, jsonMode)) as OpenAI.Chat.Completions.ChatCompletion;
  }
}
