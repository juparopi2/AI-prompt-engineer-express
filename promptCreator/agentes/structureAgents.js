const { robustJSONParser } = require("../../verificador-json");

const structureResponseSchema = {
  type: "object",
  properties: {
    restructuredPrompt: { type: "string", required: true },
  },
};

async function structureAgent(promptOptimization, metrics) {
  try {
    const messages = [
      {
        role: "system",
        content: `
        Eres un arquitecto de información especializado en diseño de prompts. Para el texto proporcionado:
            1. Aplica estructura de: objetivo principal → rol → contexto → ejemplos → restricciones
            2. Divide en secciones numeradas con encabezados claros
            3. Optimiza flujo lógico mediante conectores apropiados
            4. Utiliza formato MarkDown SIEMPRE

        Formato de Salida Obligatorio
          IMPORTANTE: Tu respuesta SIEMPRE debe seguir exactamente este formato JSON, sin excepciones en markdown:
          {
          "restructuredPrompt": string,
          }
        `,
      },
      {
        role: "user",
        content: `
            Considera las entidades y frases clave identificadas: ${JSON.stringify(
              metrics.entities
            )} y ${JSON.stringify(metrics.keyPhrases)}.
            Prompt: ${promptOptimization.processedPrompt}
            `,
      },
    ];
    const response = await fetch(process.env.GPT_4O_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.GPT_4O_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        max_tokens: 600,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null,
      }),
    });

    if (!response.ok) {
      console.log("STRUCTURE AGENT : Error querying OpenAI:", response);
      return promptOptimization;
    }

    const data = await response.json();
    const agentAns = data.choices[0].message.content;

    const parsedResponse = robustJSONParser(agentAns, structureResponseSchema);

    if (
      !parsedResponse ||
      !parsedResponse.success ||
      !parsedResponse.validSchema
    ) {
      console.log(
        "STRUCTURE AGENT : Error parsing response parsedResponse",
        parsedResponse
      );
      return promptOptimization;
    }

    promptOptimization.processedPrompt =
      parsedResponse.parsed.restructuredPrompt;

    return promptOptimization;
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    throw error;
  }
}

module.exports = { structureAgent };
