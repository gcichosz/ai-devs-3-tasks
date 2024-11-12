import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';
import { OpenAISkill } from '../skills/open-ai/open-ai-skill';

// TODO: Setup LangChain to manage prompts
// TODO: Use LLM to analyze map fragments and determine the most likely city based on the analysis results
// TODO: Identify any outlier results that might be from a different city
// TODO: Determine the final city name based on the analysis and outlier detection
// TODO: Submit the identified city name as the flag to the headquarters

async function main() {
  const imageManipulationSkill = new ImageManipulationSkill();
  const openAiSkill = new OpenAISkill(process.env.OPENAI_API_KEY);

  const base64MapImage = await imageManipulationSkill.prepareImage('./src/map/maps/mapa-1.png');
  // console.log(base64MapImage);

  const recognizeResponse = await openAiSkill.completionFull(
    [
      {
        role: 'system',
        content: 'You are a map recognition expert. Identify the name of the streets you see on the map.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64MapImage}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    'gpt-4o',
  );
  console.log(recognizeResponse.choices[0].message.content);
}

main();
