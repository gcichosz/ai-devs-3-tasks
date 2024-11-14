import Groq from 'groq-sdk';
import { toFile } from 'openai';

export class SpeechToTextSkill {
  private readonly groq: Groq;

  constructor(private readonly groqApiKey: string) {
    this.groq = new Groq({ apiKey: groqApiKey });
  }

  async transcribe(speech: Buffer, language: string = 'pl'): Promise<string> {
    const transcription = await this.groq.audio.transcriptions.create({
      file: await toFile(speech, 'speech.mp3'),
      model: 'whisper-large-v3',
      language,
    });

    return transcription.text;
  }
}
