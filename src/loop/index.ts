import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

// TODO: After finding Barbara's city, send report to headquarters

interface Clues {
  people: Set<string>;
  places: Set<string>;
}

interface APIResponse {
  code: number;
  message: string;
}

const getInitialClues = async (file: string, openAiSkill: OpenAISkill): Promise<Clues> => {
  const content = await fs.readFile(file, 'utf-8');

  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY!, process.env.LANGFUSE_SECRET_KEY!);
  const getCluesPrompt = await langfuseService.getPrompt('extract-people-places');
  const [getCluesPromptMessage] = getCluesPrompt.compile();

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
  console.log('Checking tracks:', tracksToCheck);

  const sendRequestSkill = new SendRequestSkill();
  const promises = tracksToCheck.map((track) =>
    sendRequestSkill.postRequest(`https://centrala.ag3nts.org/${type}`, {
      apikey: process.env.AI_DEVS_API_KEY,
      query: track,
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

const updateClues = async (
  clues: Clues,
  peopleClues: APIResponse[],
  placeClues: APIResponse[],
  openAiSkill: OpenAISkill,
) => {
  const people = peopleClues.map((person) => person.message).join(' ');
  const places = placeClues.map((place) => place.message).join(' ');
  const normalizationPrompt =
    "You are a helpful assistant. You're only task is to remove the diacritics from the text. If the text is empty, return an empty string.";
  const normalizationRequests = [
    openAiSkill.completionFull(
      [{ role: 'system', content: normalizationPrompt } as never, { role: 'user', content: people } as never],
      'gpt-4o',
    ),
    openAiSkill.completionFull(
      [{ role: 'system', content: normalizationPrompt } as never, { role: 'user', content: places } as never],
      'gpt-4o',
    ),
  ];

  const [normalizedPeopleResponse, normalizedPlacesResponse] = await Promise.all(normalizationRequests);
  const normalizedPeople = normalizedPeopleResponse.choices[0].message.content
    ? normalizedPeopleResponse.choices[0].message.content.split(' ')
    : [];
  const normalizedPlaces = normalizedPlacesResponse.choices[0].message.content
    ? normalizedPlacesResponse.choices[0].message.content.split(' ')
    : [];

  return {
    people: new Set([...clues.people, ...normalizedPeople]),
    places: new Set([...clues.places, ...normalizedPlaces]),
  };
};

const main = async () => {
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY!);

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
    const rawClues = await getInitialClues('./src/loop/people/barbara.txt', openAiSkill);
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

  for (let i = 0; i < 10; i++) {
    console.log(`Loop number: ${i + 1}`);
    const placeClues = await checkSurveillance(clues.people, visited.people, 'people');
    console.log('Place clues:', placeClues);
    const peopleClues = await checkSurveillance(clues.places, visited.places, 'places');
    console.log('People clues:', peopleClues);

    visited = updateVisited(visited, clues.people, clues.places);
    clues = await updateClues(clues, peopleClues as never, placeClues as never, openAiSkill);
    console.log('Visited:', visited);
    console.log('Clues:', clues);
  }
};

main();
