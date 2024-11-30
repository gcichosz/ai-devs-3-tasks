import bodyParser from 'body-parser';
import express from 'express';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

const locationMap: { [key: string]: string } = {
  A4: 'start',
  B4: 'łąka',
  C4: 'drzewo',
  D4: 'dom',
  A3: 'łąka',
  B3: 'wiatrak',
  C3: 'łąka',
  D3: 'łąka',
  A2: 'łąka',
  B2: 'łąka',
  C2: 'skały',
  D2: 'las',
  A1: 'skały',
  B1: 'skały',
  C1: 'samochód',
  D1: 'jaskinia',
};

const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
const openAiService = new OpenAISkill(process.env.OPENAI_API_KEY);
const mapMovementPrompt = await langfuseService.getPrompt('map-movement');
const [mapMovementPromptMessage] = mapMovementPrompt.compile();

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  console.log(req.body);
  const instruction = req.body.instruction;
  console.log(instruction);

  const mapMovementResponse = await openAiService.completionFull(
    [mapMovementPromptMessage as never, { role: 'user', content: instruction }],
    'gpt-4o-mini',
    true,
  );
  const mapMovementResponseObject = JSON.parse(mapMovementResponse.choices[0].message.content!);
  console.log(mapMovementResponseObject);

  const location = mapMovementResponseObject.location as string;
  const description = locationMap[location];
  console.log(`${location} -> ${description}`);

  res.json({ description });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
