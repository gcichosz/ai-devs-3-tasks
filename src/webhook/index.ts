import bodyParser from 'body-parser';
import express from 'express';

// TODO: Read instruction and pass it to LLM to get location
// TODO: Return LLM response to the client in description field

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  console.log(req.body);
  const instruction = req.body.instruction;
  console.log(instruction);
  res.json({ description: '' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
