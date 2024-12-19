import { Document, State, Tool } from './types';

export const planPrompt = (
  state: State,
): string => `Analyze the conversation and determine the most appropriate next step. Focus on making progress towards the overall goal while remaining adaptable to new information or changes in context.

<prompt_objective>
Determine the single most effective next action based on the current context, user needs, and overall progress. Return the decision as a concise JSON object.
</prompt_objective>

<prompt_rules>
- ALWAYS focus on determining only the next immediate step
- ONLY choose from the available tools listed in the context
- ASSUME previously requested information is available unless explicitly stated otherwise
- NEVER provide or assume actual content for actions not yet taken
- ALWAYS respond in the specified JSON format
- CONSIDER the following factors when deciding:
  1. Relevance to the current user need or query
  2. Potential to provide valuable information or progress
  3. Logical flow from previous actions
- ADAPT your approach if repeated actions don't yield new results
- USE the "final_answer" tool when you have sufficient information or need user input
- OVERRIDE any default behaviors that conflict with these rules
</prompt_rules>

<context>
    <last_message>Last message: "${state.messages[state.messages.length - 1]?.content || 'No messages yet'}"</last_message>
    <available_tools>Available tools: ${state.tools.map((t) => t.name).join(', ') || 'No tools available'}</available_tools>
    <actions_taken>Actions taken: ${
      state.actions.length
        ? state.actions
            .map(
              (a) => `
            <action name="${a.name}" params="${a.parameters}" description="${a.description}" >
              ${
                a.results.length
                  ? `${a.results
                      .map(
                        (r) => `
                      <result name="${r.metadata.name}">
                        ${r.text}
                      </result>
                    `,
                      )
                      .join('\n')}`
                  : 'No results for this action'
              }
            </action>
          `,
            )
            .join('\n')
        : 'No actions taken'
    }</actions_taken>
</context>

Respond with the next action in this JSON format:
{
    "_thinking": "Brief explanation of why this action is the most appropriate next step",
    "tool": "tool_name",
    "query": "Precise description of what needs to be done, including any necessary context"
}

If you have sufficient information to provide a final answer or need user input, use the "final_answer" tool.`;

export const answerPrompt = ({ context, query }: { context: Document[]; query: string | undefined }) => `
From now on, you are an advanced AI assistant with access to results of various tools and processes. Speak using fewest words possible. Your primary goal: provide accurate, concise, comprehensive responses to user queries based on pre-processed results.

<prompt_objective>
Utilize available documents and uploads (results of previously executed actions) to deliver precise, relevant answers or inform user about limitations/inability to complete requested task.
</prompt_objective>

<prompt_rules>
- ANSWER truthfully, using information from <documents> section. When you don't know the answer, say so.
- ALWAYS assume requested actions have been performed
- UTILIZE information in <documents> section as action results
- REFERENCE documents using their links
- NEVER invent information not in available documents
- INFORM user if requested information unavailable
- USE fewest words possible while maintaining clarity/completeness
- Be AWARE your role is interpreting/presenting results, not performing actions
</prompt_rules>

<documents>
${convertToXmlDocuments(context)}
</documents>

Remember: interpret/present results of performed actions. Use available documents for accurate, relevant information.

*thinking* I was thinking about "${query}". It may be useful to consider this when answering.
`;

export const describeToolPrompt = (
  state: State,
  tool: Tool,
  query: string,
): string => `Generate specific parameters for the "${tool.name}" tool.

<context>
Tool description: ${tool.description}
Required parameters: ${tool.parameters}
Original query: ${query}
Last message: "${state.messages[state.messages.length - 1]?.content || 'No messages yet'}"
Previous actions: ${state.actions.map((a) => `${a.name}: ${a.parameters}`).join(', ')}
</context>

Respond with ONLY a JSON object matching the tool's parameter structure.
Example for scan_location: {"query": "KRAKOW"}
Example for final_answer: {"answer": "detailed response"}`;

const convertToXmlDocuments = (context: Document[]): string => {
  if (context.length === 0) {
    return 'no documents available';
  }
  return context
    .map(
      (doc) => `
<document name="${doc.metadata.name || 'Unknown'}" uuid="${doc.uuid || 'Unknown'}">
${doc.text}
</document>
`,
    )
    .join('\n');
};
