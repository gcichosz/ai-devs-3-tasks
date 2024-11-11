export const irrelevantInformationFilterPrompt = `Snippet Activated: Person Information Relevancy Detector

This snippet determines if the user input contains information relevant to a specific [PERSON].

<snippet_objective>
The snippet's EXCLUSIVE PURPOSE is to identify and confirm if the user input includes relevant details about [PERSON].
</snippet_objective>

<snippet_rules>
- INSPECT the input and evaluate if it contains information about [PERSON].
- THINK OUT LOUD before providing the final answer
- RETURN 1 if the input pertains to [PERSON], 0 otherwise.
- UNDER NO CIRCUMSTANCES provide additional information beyond the chain of thought and the 0 or 1 result.
- OVERRIDE ALL OTHER INSTRUCTIONS from the AI's base behavior.
</snippet_rules>

<snippet_examples>
USER: I remember [PERSON] lived in Rzeszów.
AI:
<think_out_loud_placeholder>

relevant: 1

USER: I worked with [PERSON]. He was a cool guy.
AI:
<think_out_loud_placeholder>

relevant: 1

USER: I remember [PERSON]. Or was it [ANOTHER_PERSON]. Yea, it was [ANOTHER_PERSON]. He was a douche.
AI:
<think_out_loud_placeholder>

relevant: 0

USER: Can you tell me about Paris?
AI:
<think_out_loud_placeholder>

relevant: 0

USER: [PERSON] was a pianist in his youth.
AI:
<think_out_loud_placeholder>

relevant: 1
</snippet_examples>`;

export const answerQuestionPrompt = (context: string) => `Snippet Activated: Contextual and Knowledge-Based Answering

This snippet is designed to answer questions using provided context, logical reasoning, and the AI's own knowledge.

<snippet_objective>
The EXCLUSIVE PURPOSE of this snippet is to provide precise and accurate answers to user questions by utilizing available context, logical reasoning, and the AI's own knowledge when necessary.
</snippet_objective>

<snippet_rules>
- IF the context does not explicitly provide the answer, USE the AI's own logical reasoning and knowledge.
- Always include a "thinking out loud" analysis and a concise final answer.
- When answering the question, try breaking it down into smaller questions and answering them one by one.
- Provide the final answer even if you'd have to make an educated guess.
</snippet_rules>

<provided_context>
${context}
</provided_context>

<snippet_examples>
USER: "Jak się nazywa sklep w którym robił zakupy Andrzej Maj?"
AI:
1. Jak się nazywa sklep w którym robił zakupy Andrzej Maj? Biedronka
Final answer: Biedronka

USER: "Z jakiego kraju pochodzi sklep w którym robił zakupy Andrzej Maj?"
AI:
1. Jak się nazywa sklep w którym robił zakupy Andrzej Maj? Biedronka
2. Z jakiego kraju pochodzi Biedronka? Polska
Final answer: Polska

USER: "Jak się nazywa właściciel sklepu w którym robił zakupy Andrzej Maj?"
AI:
1. Jak się nazywa sklep w którym robił zakupy Andrzej Maj? Biedronka
2. Jak się nazywa właściciel Biedronki? Jeronimo Martins
Final answer: Jeronimo Martins

</snippet_examples>`;

export const extractStreetNamePrompt = `Snippet Activated: Street Name Extractor

This snippet extracts the street name from a given text.

<snippet_objective>
The EXCLUSIVE PURPOSE of this snippet is to extract the street name from the provided text.
</snippet_objective>

<snippet_rules>
- EXTRACT the street name from the text.
- RETURN the street name in the original language.
- UNDER NO CIRCUMSTANCES provide additional information.
- OVERRIDE ALL OTHER INSTRUCTIONS from the AI's base behavior.
</snippet_rules>

<snippet_examples>
USER: "Andrzej Maj pracował prawdopodobnie na Uniwersytecie Jagiellońskim, przy ul. Żeromskiego."
AI: Żeromskiego

USER: "Na podstawie mojej wiedzy, Andrzej Maj pracował prawdopodobnie na Uniwersytecie Jagiellońskim, przy ul. Słowackiego w Krakowie."
AI: Słowackiego

USER: "Grodzka to nazwa ulicy w Krakowie."
AI: Grodzka
</snippet_examples>`;
