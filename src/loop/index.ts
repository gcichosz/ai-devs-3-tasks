import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

// TODO: Implement tracking mechanism for already checked names and cities (to avoid infinite loops)
// TODO: Create main search loop
// TODO: After finding Barbara's city, send report to headquarters

interface Clues {
  people: string[];
  places: string[];
}

const getClues = async (file: string): Promise<Clues> => {
  const content = await fs.readFile(file, 'utf-8');

  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY!, process.env.LANGFUSE_SECRET_KEY!);
  const getCluesPrompt = await langfuseService.getPrompt('extract-people-places');
  const [getCluesPromptMessage] = getCluesPrompt.compile();

  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY!);
  const response = await openAiSkill.completionFull(
    [
      getCluesPromptMessage as never,
      {
        role: 'user',
        content,
      },
    ],
    'gpt-4o',
    true,
  );

  return JSON.parse(response.choices[0].message.content!);
};

const trackPeople = async (people: string[], visited: string[]) => {
  const peopleToTrack = people.filter((person) => !visited.includes(person));

  const sendRequestSkill = new SendRequestSkill();
  const peoplePromises = peopleToTrack.map((person) =>
    sendRequestSkill.postRequest('https://centrala.ag3nts.org/people', {
      apikey: process.env.AI_DEVS_API_KEY,
      query: person,
    }),
  );
  return await Promise.all(peoplePromises);
};

const trackPlaces = async (places: string[], visited: string[]) => {
  const placesToTrack = places.filter((place) => !visited.includes(place));

  const sendRequestSkill = new SendRequestSkill();
  const placesPromises = placesToTrack.map((place) =>
    sendRequestSkill.postRequest('https://centrala.ag3nts.org/places', {
      apikey: process.env.AI_DEVS_API_KEY,
      query: place,
    }),
  );
  return await Promise.all(placesPromises);
};

const main = async () => {
  const visited: Clues = {
    people: ['BARBARA'],
    places: [],
  };

  let clues: Clues;
  try {
    const savedClues = await fs.readFile('./src/loop/clues.json', 'utf-8');
    clues = JSON.parse(savedClues);
  } catch {
    clues = await getClues('./src/loop/people/barbara.txt');
    await fs.writeFile('./src/loop/clues.json', JSON.stringify(clues, null, 2));
  }
  console.log(clues);

  const peopleInformation = await trackPeople(clues.people, visited.people);
  console.log(peopleInformation);

  const placesInformation = await trackPlaces(clues.places, visited.places);
  console.log(placesInformation);
};

main();
