import { promises as fs } from 'fs';

import { SpeechToTextSkill } from '../skills/speech-to-text/SpeechToTextSkill';

// TODO: Create a function that combines all transcriptions into a shared context
// TODO: Add a LLM function to filter out irrelevant information
// TODO: Implement context analysis using LLM to find the name of the street where Prof. Maj's university is located
// TODO: Add logic to check testimony consistency, with special attention to Rafal's testimony
// TODO: Implement chain-of-thought prompting for better model reasoning
// TODO: Implement sending response to headquarters (endpoint /report) with task name 'mp3'

const main = async () => {
  const speechToTextSkill = new SpeechToTextSkill(process.env.GROQ_API_KEY);

  // TODO: Use all the files
  const speech = await fs.readFile('./src/interrogation/interrogation-files/adam.m4a');
  const transcription = await speechToTextSkill.transcribe(speech);
  console.log(transcription);
};

main();
