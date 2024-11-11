import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SpeechToTextSkill } from '../skills/speech-to-text/SpeechToTextSkill';
import { answerQuestionPrompt, irrelevantInformationFilterPrompt } from './prompts';

// TODO: Create a function that combines all transcriptions into a shared context
// TODO: Add logic to check testimony consistency, with special attention to Rafal's testimony
// TODO: Implement chain-of-thought prompting for better model reasoning
// TODO: Implement sending response to headquarters (endpoint /report) with task name 'mp3'

const main = async () => {
  const speechToTextSkill = new SpeechToTextSkill(process.env.GROQ_API_KEY);
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  // TODO: Use all the files
  const cacheFile = await fs.readFile('./src/interrogation/cache.json', 'utf-8');
  const cache = JSON.parse(cacheFile);

  let transcription = '';
  if (!cache.adam) {
    const speech = await fs.readFile('./src/interrogation/interrogation-files/adam.m4a');
    transcription = await speechToTextSkill.transcribe(speech);
    cache.adam = transcription;
    await fs.writeFile('./src/interrogation/cache.json', JSON.stringify(cache, null, 2));
  } else {
    transcription = cache.adam;
  }
  console.log(transcription);

  const irrelevantInformationResponse = await openAiSkill.completionFull([
    { role: 'system', content: irrelevantInformationFilterPrompt },
    { role: 'user', content: transcription },
  ]);
  console.log(irrelevantInformationResponse.choices[0].message.content);

  const answerQuestionResponse = await openAiSkill.completionFull([
    { role: 'system', content: answerQuestionPrompt(`- ${transcription}`) },
    { role: 'user', content: "What is the name of the street where Prof. Maj's university is located?" },
  ]);
  console.log(answerQuestionResponse.choices[0].message.content);
};

main();
