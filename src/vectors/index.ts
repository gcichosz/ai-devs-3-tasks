import { QdrantService } from '../utils/qdrant/qdrant-service';

// TODO: Create embeddings for each report using OpenAI embeddings model (metadata: date, keywords?)
// TODO: Create embedding for the search query: "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?"
// TODO: Search vector database with the query embedding (limit: 1)
// TODO: Format the date as YYYY-MM-DD
// TODO: Send the formatted date to centrala.ag3nts.org/report (task: "wektory", answer: formatted date)

const createVectorCollection = async () => {
  const qdrantService = new QdrantService(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);
  await qdrantService.createCollection('weapons-tests');
};

const main = async () => {
  await createVectorCollection();
};

main();
