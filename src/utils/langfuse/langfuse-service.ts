import {
  Langfuse,
  LangfuseGenerationClient,
  LangfuseSpanClient,
  LangfuseTraceClient,
  TextPromptClient,
} from 'langfuse';
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// TODO: Move to services
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

  createTrace(options: { id: string; name: string; sessionId: string }): LangfuseTraceClient {
    return this.langfuse.trace(options);
  }

  createSpan(trace: LangfuseTraceClient, name: string, input?: unknown): LangfuseSpanClient {
    return trace.span({ name, input: input ? JSON.stringify(input) : undefined });
  }

  finalizeSpan(
    span: LangfuseSpanClient,
    name: string,
    input: ChatCompletionMessageParam[],
    output: ChatCompletion,
  ): void {
    span.update({
      name,
      output: JSON.stringify(output.choices[0].message),
    });

    const generation: LangfuseGenerationClient = span.generation({
      name,
      model: output.model,
      input: input,
      output: output,
      usage: {
        promptTokens: output.usage?.prompt_tokens,
        completionTokens: output.usage?.completion_tokens,
        totalTokens: output.usage?.total_tokens,
      },
    });
    generation.end();
    span.end();
  }

  async finalizeTrace(trace: LangfuseTraceClient): Promise<void> {
    trace.update({});
    await this.langfuse.flushAsync();
  }

  async shutdownAsync(): Promise<void> {
    await this.langfuse.shutdownAsync();
  }
}
