import { createByModelName } from '@microsoft/tiktokenizer';
import { v4 as uuidv4 } from 'uuid';

import { Document } from './types';

export class TextSplitter {
  private readonly modelName: string;
  private tokenizer?: Awaited<ReturnType<typeof createByModelName>>;
  private readonly specialTokens = new Map<string, number>([
    ['<|im_start|>', 200264],
    ['<|im_end|>', 200265],
    ['<|im_sep|>', 200266],
  ]);

  constructor(modelName: string = 'gpt-4o-mini') {
    this.modelName = modelName;
  }

  public async initializeTokenizer(): Promise<void> {
    if (!this.tokenizer) {
      this.tokenizer = await createByModelName(this.modelName, this.specialTokens);
    }
  }

  async split(text: string, limit: number): Promise<Document[]> {
    console.log(`Starting split process with limit: ${limit} tokens`);
    const chunks: Document[] = [];
    let position = 0;
    const totalLength = text.length;

    while (position < totalLength) {
      console.log(`Processing chunk starting at position: ${position}`);
      const { chunkText, chunkEnd } = this.getChunk(text, position, limit);
      const tokens = this.countTokens(chunkText);
      console.log(`Chunk tokens: ${tokens}`);

      chunks.push({
        uuid: uuidv4(),
        text: chunkText,
        metadata: {
          tokens,
        },
      });

      console.log(`Chunk processed. New position: ${chunkEnd}`);
      position = chunkEnd;
    }

    console.log(`Split process completed. Total chunks: ${chunks.length}`);
    return chunks;
  }

  private getChunk(text: string, start: number, limit: number): { chunkText: string; chunkEnd: number } {
    console.log(`Getting chunk starting at ${start} with limit ${limit}`);

    // Account for token overhead due to formatting
    const overhead = this.countTokens(this.formatForTokenization('')) - this.countTokens('');

    // Initial tentative end position
    let end = Math.min(
      start + Math.floor(((text.length - start) * limit) / this.countTokens(text.slice(start))),
      text.length,
    );

    // Adjust end to avoid exceeding token limit
    let chunkText = text.slice(start, end);
    let tokens = this.countTokens(chunkText);

    while (tokens + overhead > limit && end > start) {
      console.log(`Chunk exceeds limit with ${tokens + overhead} tokens. Adjusting end position...`);
      end = this.findNewChunkEnd(start, end);
      chunkText = text.slice(start, end);
      tokens = this.countTokens(chunkText);
    }

    // Adjust chunk end to align with newlines without significantly reducing size
    end = this.adjustChunkEnd(text, start, end, limit);

    chunkText = text.slice(start, end);
    tokens = this.countTokens(chunkText);
    console.log(`Final chunk end: ${end}`);
    return { chunkText, chunkEnd: end };
  }

  private countTokens(text: string): number {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized');
    }
    const formattedContent = this.formatForTokenization(text);
    const tokens = this.tokenizer.encode(formattedContent, Array.from(this.specialTokens.keys()));
    return tokens.length;
  }

  private formatForTokenization(text: string): string {
    return `<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant<|im_end|>`;
  }

  private findNewChunkEnd(start: number, end: number): number {
    // Reduce end position to try to fit within token limit
    let newEnd = end - Math.floor((end - start) / 10); // Reduce by 10% each iteration
    if (newEnd <= start) {
      newEnd = start + 1; // Ensure at least one character is included
    }
    return newEnd;
  }

  private adjustChunkEnd(text: string, start: number, end: number, limit: number): number {
    const minChunkTokens = limit * 0.8; // Minimum chunk size is 80% of limit

    const nextNewline = text.indexOf('\n', end);
    const prevNewline = text.lastIndexOf('\n', end);

    // Try extending to next newline
    if (nextNewline !== -1 && nextNewline < text.length) {
      const extendedEnd = nextNewline + 1;
      const chunkText = text.slice(start, extendedEnd);
      const tokens = this.countTokens(chunkText);
      if (tokens <= limit && tokens >= minChunkTokens) {
        console.log(`Extending chunk to next newline at position ${extendedEnd}`);
        return extendedEnd;
      }
    }

    // Try reducing to previous newline
    if (prevNewline > start) {
      const reducedEnd = prevNewline + 1;
      const chunkText = text.slice(start, reducedEnd);
      const tokens = this.countTokens(chunkText);
      if (tokens <= limit && tokens >= minChunkTokens) {
        console.log(`Reducing chunk to previous newline at position ${reducedEnd}`);
        return reducedEnd;
      }
    }

    // Return original end if adjustments aren't suitable
    return end;
  }
}
