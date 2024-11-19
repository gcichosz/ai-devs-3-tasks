import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { QdrantService } from '../utils/qdrant/qdrant-service';

// TODO: Create embedding for the search query: "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?"
// TODO: Search vector database with the query embedding (limit: 1)
// TODO: Format the date as YYYY-MM-DD
// TODO: Send the formatted date to centrala.ag3nts.org/report (task: "wektory", answer: formatted date)
// TODO: Add keywords to the metadata

const QDRANT_COLLECTION_NAME = 'weapons-tests';

interface ReportDocument {
  text: string;
  embedding?: number[];
  metadata: {
    date: string;
  };
}

const createVectorCollection = async () => {
  const qdrantService = new QdrantService(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);
  await qdrantService.createCollection(QDRANT_COLLECTION_NAME);
};

const getReports = async () => {
  const reportsDir = './src/vectors/weapons-tests';
  const files = await fs.readdir(reportsDir);

  const reports = await Promise.all(
    files.map(async (file) => {
      const content = await fs.readFile(path.join(reportsDir, file), 'utf-8');
      return {
        text: content,
        metadata: { date: path.basename(file, '.txt').replaceAll('_', '-'), filename: file },
      };
    }),
  );

  return reports;
};

const createEmbeddings = async (reports: ReportDocument[]) => {
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const embeddedReports = await Promise.all(
    reports.map(async (report) => {
      const embedding = await openAiSkill.createEmbedding(report.text);
      return { ...report, embedding };
    }),
  );

  return embeddedReports;
};

const saveReports = async (reports: ReportDocument[]) => {
  const qdrantService = new QdrantService(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);

  const points = reports.map((report) => ({
    id: uuidv4(),
    vector: report.embedding!,
    payload: {
      text: report.text,
      ...report.metadata,
    },
  }));

  await qdrantService.upsert(QDRANT_COLLECTION_NAME, points);
};

const main = async () => {
  await createVectorCollection();

  const reports = await getReports();
  console.log(reports);

  const embeddedReports = await createEmbeddings(reports);
  console.log(embeddedReports);

  await saveReports(embeddedReports);
};

main();
