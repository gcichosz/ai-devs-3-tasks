import { ImageManipulationSkill } from '../skills/image-manipulation/image-manipulation-skill';

// TODO: Use OpenAI skill to analyze map fragments
// TODO: Setup LangChain to manage prompts
// TODO: Use LLM to analyze map fragments and determine the most likely city based on the analysis results
// TODO: Identify any outlier results that might be from a different city
// TODO: Determine the final city name based on the analysis and outlier detection
// TODO: Submit the identified city name as the flag to the headquarters

async function main() {
  const imageManipulationSkill = new ImageManipulationSkill();

  const base64MapImage = await imageManipulationSkill.prepareImage('./src/map/maps/mapa-1.png');
  console.log(base64MapImage);
}

main();
