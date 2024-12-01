import { readPdfText } from 'pdf-text-reader';

// TODO: ORC notes last page using LLM
// TODO: Get questions
// TODO: Answer questions using answer with context prompt (notes are the context)
// TODO: Report results

const readPdfNotes = async () => {
  const pdfNotes = await readPdfText({ url: './src/notes/notatnik-rafala.pdf' });
  return pdfNotes;
};

const main = async () => {
  const pdfNotes = await readPdfNotes();
  console.log(pdfNotes);
};

main();
