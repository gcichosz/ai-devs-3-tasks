import axios from 'axios';

export class LlamaSkill {
  async completionFullLocal(model: string, system: string, prompt: string): Promise<string> {
    console.log(system);
    console.log(prompt);
    const response = await axios.post('http://localhost:11434/api/generate', {
      model,
      system,
      prompt,
      stream: false,
    });
    return response.data.response;
  }
}
