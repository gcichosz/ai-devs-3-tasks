import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

// TODO: Create main search loop
// TODO: After finding Barbara's city, send report to headquarters

interface Clues {
  people: Set<string>;
  places: Set<string>;
}

interface APIResponse {
  code: number;
  message: string;
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

const checkSurveillance = async (tracks: Set<string>, visited: Set<string>, type: 'people' | 'places') => {
  const tracksToCheck = Array.from(tracks).filter((track) => !visited.has(track));

  const sendRequestSkill = new SendRequestSkill();
  const promises = tracksToCheck.map((entity) =>
    sendRequestSkill.postRequest(`https://centrala.ag3nts.org/${type}`, {
      apikey: process.env.AI_DEVS_API_KEY,
      query: entity,
    }),
  );
  return await Promise.all(promises);
};

const updateVisited = (visited: Clues, people: Set<string>, places: Set<string>) => {
  return {
    people: new Set([...visited.people, ...people]),
    places: new Set([...visited.places, ...places]),
  };
};

const updateClues = (clues: Clues, peopleClues: APIResponse[], placeClues: APIResponse[]) => {
  return {
    people: new Set([...clues.people, ...peopleClues.flatMap((person) => person.message.split(' '))]),
    places: new Set([...clues.places, ...placeClues.flatMap((place) => place.message.split(' '))]),
  };
};

const main = async () => {
  let visited: Clues = {
    people: new Set(['BARBARA']),
    places: new Set([]),
  };

  let clues: Clues;
  try {
    const savedClues = await fs.readFile('./src/loop/clues.json', 'utf-8');
    const parsedClues = JSON.parse(savedClues);
    clues = {
      people: new Set(parsedClues.people),
      places: new Set(parsedClues.places),
    };
  } catch {
    const rawClues = await getClues('./src/loop/people/barbara.txt');
    clues = {
      people: new Set(rawClues.people),
      places: new Set(rawClues.places),
    };
    await fs.writeFile(
      './src/loop/clues.json',
      JSON.stringify(
        {
          people: Array.from(clues.people),
          places: Array.from(clues.places),
        },
        null,
        2,
      ),
    );
  }
  console.log('Clues:', clues);

  const placeClues = await checkSurveillance(clues.people, visited.people, 'people');
  console.log('Place clues:', placeClues);
  const peopleClues = await checkSurveillance(clues.places, visited.places, 'places');
  console.log('People clues:', peopleClues);

  visited = updateVisited(visited, clues.people, clues.places);
  clues = updateClues(clues, peopleClues as never, placeClues as never);
  console.log('Visited:', visited);
  console.log('Clues:', clues);
};

main();
