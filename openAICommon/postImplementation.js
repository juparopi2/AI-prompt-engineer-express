async function postImplementation(
  url,
  messages,
  max_tokens,
  temperature,
  top_p,
  frequency_penalty,
  presence_penalty,
  stop,
  errorHeader
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.GPT_PRIVATE_KEY,
    },
    body: JSON.stringify({
      messages: messages,
      max_tokens: max_tokens,
      temperature: temperature,
      top_p: top_p,
      frequency_penalty: frequency_penalty,
      presence_penalty: presence_penalty,
      stop: stop,
    }),
  });

  if (!response.ok) {
    console.log(errorHeader, ": Error en la respuesta de OpenAI:", response);
    return null;
  }

  data = await response.json();
  agentAns = data.choices[0].message.content;

  return agentAns;
}

module.exports = { postImplementation };
