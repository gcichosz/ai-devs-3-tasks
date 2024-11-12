declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY: string;
    ANTHROPIC_API_KEY: string;
    FIRECRAWL_API_KEY: string;
    AI_DEVS_API_KEY: string;
    GROQ_API_KEY: string;
    LANGFUSE_PUBLIC_KEY: string;
    LANGFUSE_SECRET_KEY: string;
    OPENAI_PROJECT_ID: string;
  }
}
