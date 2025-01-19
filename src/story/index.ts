import { OpenAISkill } from '../skills/open-ai/open-ai-skill';
import { SendRequestSkill } from '../skills/send-request/send-request-skill';
import { QdrantService } from '../utils/qdrant/qdrant-service';

const QDRANT_COLLECTION = 'story';

const answerQuestion = async (
  question: string,
  openAiSkill: OpenAISkill,
  qdrantService: QdrantService,
  multiplier: number,
) => {
  console.log('❓Question:', question);
  const questionEmbedding = await openAiSkill.createEmbedding(question);
  const relevantDocuments = await qdrantService.search(QDRANT_COLLECTION, questionEmbedding, 5 * multiplier);
  // console.log('🔍 Found relevant documents:');
  // console.log(relevantDocuments);

  const answerResponse = await openAiSkill.completionFull([
    {
      role: 'system',
      content: `You are a helpful assistant. Your role is to answer questions based on the provided context concisely, using as few words as possible.
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
  const sendRequestSkill = new SendRequestSkill();

  const questions = [
    'W którym roku znajduje się Zygfryd, który wysłał "numer piąty" w przeszłość?', // 0
    'Do którego roku wysłany został numer piąty?', // 1
    'Jak nazywa się firma zbrojeniowa produkująca roboty przemysłowe i militarne?', // 2
    'Jak nazywa się firma tworząca oprogramowanie do zarządzania robotami?', // 3
    'Na jakiej ulicy znajduje się siedziba firmy Softo?', // 4
    'Jak ma na nazwisko Zygfryd M.?', // 5
    'Andrzej Maj napisał swoją pracę na temat podróży w czasie i wykorzystania LLM-ów. W którym to było roku?', // 6
    'Jak nazywa się uczelnia na której pracował Andrzej Maj i na którą marzył, aby się dostać?', // 7
    'Jak nazywał się Rafał, jeden z laborantów pracujących z Andrzejem Majem', // 8
    'Rafał zmienił swoje nazwisko na...', // 9
    'Do którego roku cofnął się Rafał?', // 10
    'Ile lat Rafał miał spędzić w Grudziądzu na nauce?', // 11
    'Kto zasugerował Rafałowi skok w czasie i kto później uczył go obsługi LLM-ów?', // 12
    'Rafał zabrał część wyników badań profesora i cofnął się z nimi w czasie. Komu je przekazał?', // 13
    'Jak nazywał się podwójny agent działający dla Zygfryda, ale przekazujący wszelkie informacje do Centrali?', // 14
    'Rafał ukrył brakującą część dokumentów w swoim komputerze. Jak brzmiało hasło do pierwszej warstwy zabezpieczeń?', // 15
    'Roboty przesłuchały wiele osób podczas poszukiwania profesora Andrzeja Maja. Jak miał na imię mężczyzna, który pomylił Andrzeja z kimś innym?', // 16
    'Jak miał na imię mężczyzna, który bał się Andrzeja Maja i uważał go za złego człowieka, a nawet nazywał go "złem"?', // 17
    'Gdzie ukrył się Rafał po przesłuchaniu przez roboty?', // 18
    'Z kim miał spotkać się w swojej kryjówce Rafał?', // 19
    'W kryjówce Rafała ktoś został zabity - kto to był?', // 20
    'Gdze planował uciec Rafał po spotkaniu z Andrzejem?', // 21
    'Kto miał czekać na Rafała w Lubawie i pomóc mu w ucieczce?', // 22
    'Jak obecnie miewa się Rafał? Określ jego stan.', // 23
  ];

  // TODO: This is a brute-force approach. Refactor to a more elegant (agentic) solution
  const correct = new Map();
  for (let attempt = 0; attempt < 4; attempt++) {
    const answers = [];
    for (let i = 0; i < questions.length; i++) {
      let answer: string | null;
      if (correct.has(i)) {
        answer = correct.get(i);
      } else {
        answer = await answerQuestion(questions[i], openAiSkill, qdrantService, Math.pow(2, attempt));
      }
      answers.push(answer);
    }

    const reportResponse = await sendRequestSkill.postRequest('https://centrala.ag3nts.org/report', {
      task: 'story',
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answers,
    });
    console.log(reportResponse);

    for (const message of (reportResponse as { ok: string[] }).ok) {
      const match = message.match(/index\[(\d+)\]/);
      if (match) {
        const index = parseInt(match[1], 10);
        correct.set(index, answers[index]);
      }
    }
    console.log(correct);
  }
};

main();
