export interface IAssistantTools {
  name: string;
  description: string;
}

export interface INextStep {
  _thinking: string;
  plan: {
    tool: string;
    query: string;
  };
}

export interface IWebPage {
  url: string;
  description?: string;
  content?: string;
}

export interface IState {
  answered: boolean;
  answers: {
    id: string;
    answer: string;
  }[];
  visitedLinks: IWebPage[];
}
