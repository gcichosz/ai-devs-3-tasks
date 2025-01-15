import express from 'express';
import { Request, Response } from 'express';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { SpeechToTextSkill } from '../skills/speech-to-text/speech-to-text-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';
import { AgentService } from './agent-service';
import { RobotImpostor } from './robot-impostor';

// TODO: Add GPT-4o-mini interaction handling
// - Implement logic for when system asks for new instructions
// - Add flag extraction functionality

const app = express();
const PORT = process.env.PORT || 3000;

const openAIService = new OpenAISkill(process.env.OPENAI_API_KEY);
const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);
const agentService = new AgentService(openAIService, langfuseService);
const sendRequestSkill = new SendRequestSkill();
const speechToTextSkill = new SpeechToTextSkill(process.env.GROQ_API_KEY);
const imageManipulationSkill = new ImageManipulationSkill();
const robotImpostor = new RobotImpostor(
  agentService,
  sendRequestSkill,
  speechToTextSkill,
  openAIService,
  imageManipulationSkill,
);

app.use(express.json());

app.post('/', async (req: Request, res: Response) => {
  console.log('🤖:');
  console.log(req.body);

  const answer = await robotImpostor.answer(req.body.question);

  res.status(200).json({
    answer,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
