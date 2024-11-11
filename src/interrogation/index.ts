import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SpeechToTextSkill } from '../skills/speech-to-text/SpeechToTextSkill';
import { answerQuestionPrompt, irrelevantInformationFilterPrompt } from './prompts';

// TODO: Implement sending response to headquarters (endpoint /report) with task name 'mp3'

const main = async () => {
  const speechToTextSkill = new SpeechToTextSkill(process.env.GROQ_API_KEY);
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const cacheFile = await fs.readFile('./src/interrogation/cache.json', 'utf-8');
  const cache = JSON.parse(cacheFile);

  const files = await fs.readdir('./src/interrogation/interrogation-files');
  console.log(files);

  const transcriptions = [];
  for (const fileName of files) {
    const personName = fileName.split('.')[0];
    if (!cache[personName]) {
      const speech = await fs.readFile(`./src/interrogation/interrogation-files/${fileName}`);
      const transcription = await speechToTextSkill.transcribe(speech);
      console.log(transcription);
      cache[personName] = transcription;
      transcriptions.push(transcription);
      await fs.writeFile('./src/interrogation/cache.json', JSON.stringify(cache, null, 2));
    } else {
      transcriptions.push(cache[personName]);
    }
  }
  console.log(transcriptions);

  const isRelevantDecisions = await Promise.all(
    transcriptions.map(async (transcription) => {
      const irrelevantInformationResponse = await openAiSkill.completionFull([
        { role: 'system', content: irrelevantInformationFilterPrompt },
        { role: 'user', content: transcription },
      ]);
      console.log(irrelevantInformationResponse.choices[0].message.content);
      return irrelevantInformationResponse.choices[0].message.content?.includes('relevant: 1') || false;
    }),
  );
  console.log(isRelevantDecisions);

  const relevantTranscriptions = transcriptions.filter((_, index) => isRelevantDecisions[index]);
  console.log(relevantTranscriptions);

  const answerQuestionResponse = await openAiSkill.completionFull(
    [
      {
        role: 'system',
        content: answerQuestionPrompt(relevantTranscriptions.map((t) => `- ${t}`).join('\n')),
      },
      // { role: 'user', content: 'Jak się nazywa uniwersytet na którym pracował Andrzej Maj?' },
      { role: 'user', content: 'Przy jakiej ulicy znajduje się uniwersytet na którym pracował Andrzej Maj?' },
    ],
    'gpt-4o',
  );
  console.log(answerQuestionResponse.choices[0].message.content);
};

main();
