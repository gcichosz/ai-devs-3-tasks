import { promises as fs } from 'fs';

import { Document } from './types';

export const loadFromCache = async (
  directory: string,
  generateDocuments: () => Promise<Document[]>,
): Promise<Document[]> => {
  const cachedDocuments = await fs.readdir(directory);
  if (cachedDocuments.length) {
    const cachedDocumentsContent = await Promise.all(
      cachedDocuments.map(async (document) => await fs.readFile(`${directory}/${document}`, 'utf-8')),
    );
    return cachedDocumentsContent.map((document) => JSON.parse(document));
  }

  const documents = await generateDocuments();
  await Promise.all(
    documents.map(async (document) => fs.writeFile(`${directory}/${document.uuid}.json`, JSON.stringify(document))),
  );

  return documents;
};
