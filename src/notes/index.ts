import { readPdfText } from 'pdf-text-reader';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { LangfuseService } from '../utils/langfuse/langfuse-service';

// TODO: Report results

const readPdfNotes = async () => {
  const pdfNotes = await readPdfText({ url: './src/notes/notatnik-rafala.pdf' });
  return pdfNotes;
};

// TODO: ORC notes last page
const readPngText = async (imageManipulationService: ImageManipulationSkill, openAiService: OpenAISkill) => {
  const image = await imageManipulationService.prepareImageFromPath('./src/notes/ostatnia-strona.png');
  const text = await openAiService.vision({ role: 'system', content: 'Extract text from image' }, [image], 'gpt-4o');
  return text;
};

const answerQuestions = async (
  questions: Record<string, string>,
  notes: string,
  openAiService: OpenAISkill,
  langfuseService: LangfuseService,
) => {
  const answerQuestionWithContextPrompt = await langfuseService.getPrompt('answer-notes-question-with-context');
  const [answerQuestionWithContextPromptMessage] = answerQuestionWithContextPrompt.compile({ context: notes });

  return await Promise.all(
    Object.entries(questions).map(async ([questionId, question]) => {
      const answerResponse = await openAiService.completionFull(
        [answerQuestionWithContextPromptMessage as never, { role: 'user', content: question }],
        'gpt-4o',
        true,
      );
      const answer = JSON.parse(answerResponse.choices[0].message.content!);
      console.log(answer);

      return { id: questionId, answer: answer.answer };
    }),
  );
};

const main = async () => {
  const imageManipulationService = new ImageManipulationSkill();
  const openAiService = new OpenAISkill(process.env.OPENAI_API_KEY);
  const sendRequestSkill = new SendRequestSkill();
  const langfuseService = new LangfuseService(process.env.LANGFUSE_PUBLIC_KEY, process.env.LANGFUSE_SECRET_KEY);

  const pdfNotes = await readPdfNotes();
  console.log(pdfNotes);

  // const pngNotes = await readPngText(imageManipulationService, openAiService);
  // console.log(pngNotes);

  const questions = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/notes.json`,
  );
  console.log(questions);

  const answers = await answerQuestions(questions as Record<string, string>, pdfNotes, openAiService, langfuseService);
  console.log(answers);
};

main();
