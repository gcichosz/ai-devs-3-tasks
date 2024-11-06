import { createByModelName } from '@microsoft/tiktokenizer';

export class TokenizerSkill {
  async countTokens(text: string, model: string): Promise<number> {
    const tokenizer = await createByModelName(model);
    return tokenizer.encode(text).length;
  }
}
