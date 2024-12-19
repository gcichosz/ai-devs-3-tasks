import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';

export interface Tool {
  uuid: string;
  name: string;
  description: string;
  instruction: string;
  parameters: string;
}

export type Document = {
  uuid: string;
  text: string;
  metadata: {
    name: string;
  };
};

export interface Action {
  uuid: string;
  name: string;
  parameters: string;
  description: string;
  results: Document[];
  tool_uuid: string;
}

export interface Step {
  name: string;
  query: string;
}

export type State = {
  tools: Tool[];
  documents: Document[];
  messages: ChatCompletionMessageParam[];
  actions: Action[];
  config: {
    max_steps: number;
    current_step: number;
    active_step?: Step | null;
  };
};
