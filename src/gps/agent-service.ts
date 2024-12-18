import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

export class AgentService {
  constructor(
    private readonly openAIService: OpenAISkill,
    private readonly langfuseService: LangfuseService,
  ) {}
}
