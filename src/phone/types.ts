export type Document = {
  uuid: string;
  text: string;
  metadata: Record<string, unknown>;
};

export type State = {
  tools: Tool[];
  documents: Document[];
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
