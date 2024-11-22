import { promises as fs } from 'fs';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

// TODO: Create function for querying people API (search by name)
// TODO: Create function for querying places API (search by city)
// TODO: Implement tracking mechanism for already checked names and cities (to avoid infinite loops)
// TODO: Create main search loop
// TODO: After finding Barbara's city, send report to headquarters

interface Clue {
  people: string[];
  places: string[];
}

const getClues = async (file: string): Promise<Clue> => {
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

const main = async () => {
  const clue = await getClues('./src/loop/people/barbara.txt');
  console.log(clue);
};

main();
