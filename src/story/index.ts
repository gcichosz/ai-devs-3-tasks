// TODO: Ingest content into vector database (create embeddings)
// TODO: Create a function to submit the answer

import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { QdrantService } from '../utils/qdrant/qdrant-service';

const QDRANT_COLLECTION = 'story';

const answerQuestion = async (question: string, openAiSkill: OpenAISkill, qdrantService: QdrantService) => {
  console.log('❓Question:', question);
  const questionEmbedding = await openAiSkill.createEmbedding(question);
  const relevantDocuments = await qdrantService.search(QDRANT_COLLECTION, questionEmbedding, 3);
  console.log('🔍 Found relevant documents:');
  console.log(relevantDocuments);

  const answerResponse = await openAiSkill.completionFull([
    {
      role: 'system',
      content: `You are a helpful assistant. Your role is to answer questions based on the provided context as concisely as possible.
      <context>
      ${relevantDocuments.map((r) => `<document type='${r.payload?.type}'>${r.payload?.text}</document>`).join('\n')}
      </context>`,
    },
    { role: 'user', content: question },
  ]);
  const answer = answerResponse.choices[0].message.content;
  console.log('💡Answer:', answer);
  return answer;
};

const main = async () => {
  const qdrantService = new QdrantService(process.env.QDRANT_URL, process.env.QDRANT_API_KEY);
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const questions = [
    'W którym roku znajduje się Zygfryd, który wysłał "numer piąty" w przeszłość?',
    'Do którego roku wysłany został numer piąty?',
    'Jak nazywa się firma zbrojeniowa produkująca roboty przemysłowe i militarne?',
    'Jak nazywa się firma tworząca oprogramowanie do zarządzania robotami?',
    'Na jakiej ulicy znajduje się siedziba firmy Softo?',
    'Jak ma na nazwisko Zygfryd M.?',
    'Andrzej Maj napisał swoją pracę na temat podróży w czasie i wykorzystania LLM-ów. W którym to było roku?',
    'Jak nazywa się uczelnia na której pracował Andrzej Maj i na którą marzył, aby się dostać?',
    'Jak nazywał się Rafał, jeden z laborantów pracujących z Andrzejem Majem',
    'Rafał zmienił swoje nazwisko na...',
    'Do którego roku cofnął się Rafał?',
    'Ile lat Rafał miał spędzić w Grudziądzu na nauce?',
    'Kto zasugerował Rafałowi skok w czasie i kto później uczył go obsługi LLM-ów?',
    'Rafał zabrał część wyników badań profesora i cofnął się z nimi w czasie. Komu je przekazał?',
    'Jak nazywał się podwójny agent działający dla Zygfryda, ale przekazujący wszelkie informacje do Centrali?',
    'Rafał ukrył brakującą część dokumentów w swoim komputerze. Jak brzmiało hasło do pierwszej warstwy zabezpieczeń?',
    'Roboty przesłuchały wiele osób podczas poszukiwania profesora Andrzeja Maja. Jak miał na imię mężczyzna, który pomylił Andrzeja z kimś innym?',
    'Jak miał na imię mężczyzna, który bał się Andrzeja Maja i uważał go za złego człowieka, a nawet nazywał go "złem"?',
    'Gdzie ukrył się Rafał po przesłuchaniu przez roboty?',
    'Z kim miał spotkać się w swojej kryjówce Rafał?',
    'W kryjówce Rafała ktoś został zabity - kto to był?',
    'Gdze planował uciec Rafał po spotkaniu z Andrzejem?',
    'Kto miał czekać na Rafała w Lubawie i pomóc mu w ucieczce?',
    'Jak obecnie miewa się Rafał? Określ jego stan.',
  ];

  const answers = [];
  for (const question of questions) {
    const answer = await answerQuestion(question, openAiSkill, qdrantService);
    answers.push(answer);
  }
};

main();
