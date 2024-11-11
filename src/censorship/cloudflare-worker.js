export default {
  async fetch(request, env) {
    const tasks = [];

    const body = await request.text();
    const q = JSON.parse(body);
    const { model, system, prompt } = q;

    // messages - chat style input
    let chat = {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    };

    const response = await env.AI.run(model, chat);
    tasks.push({ inputs: chat, response });

    // eslint-disable-next-line no-undef
    return Response.json(tasks);
  },
};
