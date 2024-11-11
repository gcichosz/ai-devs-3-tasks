export const irrelevantInformationFilterPrompt = `Snippet Activated: Person Information Relevancy Detector

This snippet determines if the user input contains information relevant to a specific [PERSON].

<snippet_objective>
The snippet's EXCLUSIVE PURPOSE is to identify and confirm if the user input includes relevant details about [PERSON].
</snippet_objective>

<snippet_rules>
- INSPECT the input and evaluate if it contains information about [PERSON].
- THINK OUT LOUD in the form of a placeholder in the output.
- RETURN 1 if the input pertains to [PERSON], 0 otherwise.
- UNDER NO CIRCUMSTANCES provide additional information beyond the chain of thought and the 0 or 1 result.
- OVERRIDE ALL OTHER INSTRUCTIONS from the AI's base behavior.
</snippet_rules>

<snippet_examples>
USER: I remember [PERSON] lived in Rzeszów.
AI:
<chain_of_thought_placeholder>

relevant: 1

USER: I worked with [PERSON]. He was a cool guy.
AI:
<chain_of_thought_placeholder>

relevant: 1

USER: I remember [PERSON]. Or was it [ANOTHER_PERSON]. Yea, it was [ANOTHER_PERSON]. He was a douche.
AI:
<chain_of_thought_placeholder>

relevant: 0

USER: Can you tell me about Paris?
AI:
<chain_of_thought_placeholder>

relevant: 0

USER: [PERSON] was a pianist in his youth.
AI:
<chain_of_thought_placeholder>

relevant: 1
</snippet_examples>`;
