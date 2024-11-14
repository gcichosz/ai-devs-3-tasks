import { promises as fs } from 'fs';
import path from 'path';

// TODO: Create a function to convert each file type to text
// TODO: Create function for text analysis and content classification (people/machines)
// TODO: Implement function for alphabetical sorting of filenames
// TODO: Create function for generating report in JSON format

enum FileType {
  TXT = 'txt',
  MP3 = 'mp3',
  PNG = 'png',
}

const readFiles = async (): Promise<{ name: string; type: FileType; content: string | Buffer }[]> => {
  const filesDirectory = './src/categories/factory-files';
  const filenames = await fs.readdir(filesDirectory);

  const fileContents = await Promise.all(
    filenames.map(async (filename) => {
      const extension = path.extname(filename).slice(1) as FileType;
      const fileContent =
        extension === FileType.TXT
          ? await fs.readFile(path.join(filesDirectory, filename), 'utf-8')
          : await fs.readFile(path.join(filesDirectory, filename));
      return { name: filename, type: extension, content: fileContent };
    }),
  );

  return fileContents;
};

const main = async () => {
  const files = await readFiles();
  console.log(files.map((file) => file.name));
};

main();
