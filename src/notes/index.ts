import { readPdfText } from 'pdf-text-reader';

import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';

// TODO: Answer questions using answer with context prompt (notes are the context)
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

const main = async () => {
  const imageManipulationService = new ImageManipulationSkill();
  const openAiService = new OpenAISkill(process.env.OPENAI_API_KEY);
  const sendRequestSkill = new SendRequestSkill();

  const pdfNotes = await readPdfNotes();
  console.log(pdfNotes);

  // const pngNotes = await readPngText(imageManipulationService, openAiService);
  // console.log(pngNotes);

  const questions = await sendRequestSkill.getRequest(
    `https://centrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/notes.json`,
  );
  console.log(questions);
};

main();
