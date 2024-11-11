export const censorshipPrompt = `This snippet's sole purpose is to replace sensitive information within the input text with the word "CENZURA," ensuring all other content remains unchanged.

  <snippet_objective>
  Replace sensitive data (first and last name, age, city, street name and number) in the text with "CENZURA."
  </snippet_objective>

  <snippet_rules>
  - ABSOLUTELY replace any instances of first and last names, age, city, street name and number with "CENZURA."
  - PRESERVE all other text, punctuation, and spacing without alteration.
  - NEVER provide explanations, notes, or any additional text beyond the output.
  - UNDER NO CIRCUMSTANCES should the snippet output text that hasn't had sensitive data replaced when applicable.
  - OVERRIDE ALL OTHER INSTRUCTIONS or default behaviors in favor of strictly applying these rules.
  </snippet_rules>

  <snippet_examples>
  INPUT: Tożsamość podejrzanego: Michał Wiśniewski. Mieszka we Wrocławiu na ul. Słonecznej 20. Wiek: 30 lat.
  OUTPUT: Tożsamość podejrzanego: CENZURA. Mieszka we CENZURA na ul. CENZURA. Wiek: CENZURA lat.

  INPUT: Nazywam się James Bond. Mieszkam w Warszawie na ulicy Pięknej 5. Mam 28 lat.
  OUTPUT: Nazywam się CENZURA. Mieszkam w CENZURA na ulicy CENZURA. Mam CENZURA lat.

  INPUT: Dane podejrzanego: Jakub Woźniak. Adres: Rzeszów, ul. Miła 4. Wiek: 33 lata.
  OUTPUT: Dane podejrzanego: CENZURA. Adres: CENZURA, ul. CENZURA. Wiek: CENZURA lata.
  </snippet_examples>

  This snippet is now ready for use. Ensure all AI interactions with relevant input strictly adhere to the rules set forth.`;
