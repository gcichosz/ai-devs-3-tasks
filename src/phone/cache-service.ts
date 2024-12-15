import { promises as fs } from 'fs';

import { Document } from './types';

export const saveToCache = async (newDocuments: Document[], directory: string) => {
  await Promise.all(
    newDocuments.map(async (document) => fs.writeFile(`${directory}/${document.uuid}.json`, JSON.stringify(document))),
  );
};

export const loadFromCache = async (directory: string): Promise<Document[]> => {
  const cachedDocuments = await fs.readdir(directory);
  if (cachedDocuments.length) {
    const cachedDocumentsContent = await Promise.all(
      cachedDocuments.map(async (document) => await fs.readFile(`${directory}/${document}`, 'utf-8')),
    );
    return cachedDocumentsContent.map((document) => JSON.parse(document));
  }

  return [];
};

export const tryLoadFromCache = async (
  directory: string,
  generateDocuments: () => Promise<Document[]>,
): Promise<Document[]> => {
  const documents = await loadFromCache(directory);
  if (documents.length) {
    return documents;
  }

  const newDocuments = await generateDocuments();
  await saveToCache(newDocuments, directory);

  return newDocuments;
};
