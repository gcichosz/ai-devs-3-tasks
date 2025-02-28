import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { QdrantService } from '../utils/qdrant/qdrant-service';

const QDRANT_COLLECTION_NAME = 'weapons-tests';
const QUERY = 'W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?';

interface ReportDocument {
  text: string;
  embedding?: number[];
  metadata: {
    date: string;
  };
}

const createVectorCollection = async (qdrantService: QdrantService) => {
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

const createEmbeddings = async (reports: ReportDocument[], openAiSkill: OpenAISkill) => {
  const embeddedReports = await Promise.all(
    reports.map(async (report) => {
      const embedding = await openAiSkill.createEmbedding(report.text);
      return { ...report, embedding };
    }),
  );

  return embeddedReports;
};

const saveReports = async (reports: ReportDocument[], qdrantService: QdrantService) => {
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

const searchReports = async (questionEmbedding: number[], qdrantService: QdrantService) => {
  const results = await qdrantService.search(QDRANT_COLLECTION_NAME, questionEmbedding, 1);
  return results;
};

const main = async () => {
  const qdrantService = new QdrantService(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  await createVectorCollection(qdrantService);

  const reports = await getReports();
  console.log(reports);

  const embeddedReports = await createEmbeddings(reports, openAiSkill);
  console.log(embeddedReports);

  await saveReports(embeddedReports, qdrantService);

  const questionEmbedding = await openAiSkill.createEmbedding(QUERY);
  console.log(questionEmbedding);

  const relevantReports = await searchReports(questionEmbedding, qdrantService);
  console.log(relevantReports);

  const sendRequestSkill = new SendRequestSkill();
  const reportResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
    task: 'wektory',
    apikey: process.env.AI_DEVS_API_KEY,
    answer: relevantReports[0]?.payload?.date,
  });
  console.log(reportResponse);
};

main();
