const { robustJSONParser } = require("../../verificador-json");

const contextResponseSchema = {
  type: "object",
  properties: {
    contextAreas: {
      type: "array",
      required: true,
      items: {
        type: "object",
        properties: {
          area: {
            type: "string",
            required: true,
          },
        },
      },
    },
    examples: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
};

// Ejemplo de implementación del agente de claridad que utiliza análisis
async function contextAgent(promptOptimization, metrics) {
  try {
    const messages = [
      {
        role: "system",
        content: `Eres un investigador experto en expansión contextual y un especialista en lingüística computacional. Para el prompt proporcionado sigue las siguientes intrucciones en pro de la claridad y el enriquecimiento contextual de un prompt:
        1. Identifica áreas clave que requieren contexto adicional basándote en las entidades detectadas.
        2. Añade temáticas de ejemplos que pueden ayudar a ilustrar el contexto del prompt.

        Si alguna de las listas tanto de áreas, referencias o ejemplos es vacía devuelve una lista vacía [].

        Procura hacer tus sugerencias buscando que el contexto sea suficientemente claro en cuanto a la audiencia objetivo, los formatos requeridos y ejemplos de referencia.
    
        Formato de Salida Obligatorio
          IMPORTANTE: Tu respuesta SIEMPRE debe seguir exactamente este formato JSON, sin excepciones en markdown:
        {
          "contextAreas": [
            {
              "area": string
            }
          ],
          "examples": string[]
        }`,
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
      console.log("CONTEXT AGENT : Error en la respuesta de OpenAI");
      return null;
    }

    const data = await response.json();
    const agentAns = data.choices[0].message.content;

    const rta = robustJSONParser(agentAns, contextResponseSchema);
    return rta;
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    throw error;
  }
}

async function integrateContext(
  promptOptimization,
  contextResults,
  commonAgentSchema
) {
  if (
    !contextResults ||
    !contextResults.success ||
    !contextResults.validSchema
  ) {
    console.log(
      "INTEGRATE CONTEXT AGENT : Error en contextResults",
      contextResults
    );
    return promptOptimization;
  }
  try {
    const messages = [
      {
        role: "system",
        content: `Eres un especialista en lingüística computacional y un investigador experto en expansión contextual:
          1. Aplica las sugerencias de amplificación de contexto para el prompt entregado por el usuario.
          2. Asume lo que creas pertinente para mejorar en las áreas de contexto identificadas o genera el mejor ejemplo posible para mejorar el prompt.
          3. Integra el contexto de forma natural al prompt original.
          4. En caso de que no haya sugerencias, no realices cambios.
          5. Si tienes dudas, puedes preguntar al usuario por la información que no puedas resolver por tu cuenta.
          6. Si no tienes dudas, puedes enviar una lista vacía.
  
        Formato de Salida Obligatorio
          IMPORTANTE: Tu respuesta SIEMPRE debe seguir exactamente este formato JSON, sin excepciones en markdown:
        {
            "processedPrompt": string
            "doubts": string[]
        }`,
      },
      {
        role: "user",
        content: `
        - Considera las siguientes sugerencias:
          ${JSON.stringify(contextResults.parsed)}

        - Prompt: 
        ${promptOptimization.processedPrompt}
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
      console.log("INTEGRATE CONTEXT AGENT : Error en la respuesta de OpenAI");
      return promptOptimization;
    }

    const data = await response.json();

    const agentAns = data.choices[0].message.content;

    const parsedResponse = robustJSONParser(agentAns, commonAgentSchema);

    if (
      !parsedResponse ||
      !parsedResponse.success ||
      !parsedResponse.validSchema
    ) {
      console.log(
        "INTEGRATE CONTEXT AGENT : Error en la respuesta de parser",
        parsedResponse
      );
      return promptOptimization;
    }

    promptOptimization.processedPrompt = parsedResponse.parsed.processedPrompt;
    promptOptimization.doubts = [
      ...promptOptimization.doubts,
      ...parsedResponse.parsed.doubts,
    ];

    return promptOptimization;
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    throw error;
  }
}

module.exports = { contextAgent, integrateContext };
