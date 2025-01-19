export type Document = {
  uuid: string;
  text: string;
  metadata: {
    type: string;
  };
};

export type State = {
  tools: Tool[];
  documents: Document[];
  actions: Action[];
  config: {
    max_steps: number;
    current_step: number;
  };
};

export interface Tool {
  uuid: string;
  name: string;
  description: string;
  instruction: string;
  parameters: string;
}

export interface Action {
  uuid: string;
  name: string;
  parameters: string;
  description: string;
  results: Document[];
  tool_uuid: string;
}
