import axios from 'axios';

export class LlamaSkill {
  async completionFull(model: string, prompt: string): Promise<string> {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model,
      prompt,
      stream: false,
    });
    return response.data.response;
  }
}
