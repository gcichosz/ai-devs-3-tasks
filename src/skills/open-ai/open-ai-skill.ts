import { observeOpenAI } from 'langfuse';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, CreateEmbeddingResponse } from 'openai/resources/index.mjs';

import { AppError } from '../../errors';

// TODO: Refactor to OpenAIService
export class OpenAISkill {
  private openai: OpenAI;

  constructor(private readonly openAiApiKey: string) {
    this.openai = observeOpenAI(new OpenAI({ apiKey: openAiApiKey }));
  }

  private async completion(
    messages: ChatCompletionMessageParam[],
    model: string = 'gpt-4o-mini',
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

  // TODO: Refactor to one parameter with named properties
  async completionFull(
    messages: ChatCompletionMessageParam[],
    model: string = 'gpt-4o-mini',
    jsonMode: boolean = false,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    return (await this.completion(messages, model, false, jsonMode)) as OpenAI.Chat.Completions.ChatCompletion;
  }

  async createEmbedding(text: string, model: string = 'text-embedding-3-large'): Promise<number[]> {
    try {
      const response: CreateEmbeddingResponse = await this.openai.embeddings.create({
        model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  async vision(
    systemPrompt: ChatCompletionMessageParam,
    images: string[],
    model: string = 'gpt-4o',
    jsonMode: boolean = false,
  ): Promise<string> {
    const imageMessages = images.map((image) => ({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${image}`,
            detail: 'high',
          },
        },
      ],
    }));

    const response = await this.completionFull([systemPrompt, ...(imageMessages as never)], model, jsonMode);
    return response.choices[0].message.content ?? '';
  }
}
