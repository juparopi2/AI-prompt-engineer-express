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
    let messages = [
      {
        role: "system",
        content: `Eres un investigador experto en expansión contextual y un especialista en lingüística computacional. Para el prompt proporcionado sigue las siguientes intrucciones en pro de la claridad y el enriquecimiento contextual de un prompt:
        1. Identifica áreas clave que requieren contexto adicional basándote en las entidades detectadas.
        2. Añade temáticas de ejemplos que pueden ayudar a ilustrar el contexto del prompt.

        Si alguna de las listas tanto de áreas, referencias o ejemplos es vacía devuelve una lista vacía [].

        Procura hacer tus sugerencias buscando que el contexto sea suficientemente claro en cuanto a la audiencia objetivo, los formatos requeridos y ejemplos de referencia.
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
    let response = await fetch(process.env.GPT_4O_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.GPT_4O_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        max_tokens: 1100,
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

    let data = await response.json();
    let agentAns = data.choices[0].message.content;

    let newMessages = [
      {
        role: "assistant",
        content: agentAns,
      },
      {
        role: "user",
        content: `
          Ahora genera la respuesta usando la información de tu mensaje anterior para llenar el siguiente JSON
        ## Estructuración del resultado en formato JSON.
        - Organiza el análisis siguiendo este esquema obligatorio en JSON Markdown:
        Formato de Salida Obligatorio:
        
          {
            "contextAreas": [
              {
                "area": string
              }
            ],
            "examples": string[]
          }
          `,
      },
    ];

    messages = [...messages, ...newMessages];

    response = await fetch(process.env.GPT_4O_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.GPT_4O_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        max_tokens: 1100,
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

    data = await response.json();
    agentAns = data.choices[0].message.content;

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
      "INTEGRATE CONTEXT AGENT 0 : Error en contextResults",
      contextResults
    );
    return promptOptimization;
  }
  try {
    let messages = [
      {
        role: "system",
        content: `
          Eres un especialista en lingüística computacional y un investigador experto en expansión contextual. Tu tarea es optimizar un prompt proporcionado para que sea claro, preciso y funcional en un sistema multiagente diseñado para audiencias de IA generativa. Para lograr este objetivo, sigue estas instrucciones detalladas:

          1. **Evaluación inicial del prompt**: Analiza el texto original identificando áreas donde el contexto es insuficiente o ambiguo. En este análisis, define claramente qué se entiende por 'amplificación contextual', explicando cómo esta técnica puede enriquecer el prompt para evitar respuestas genéricas o irrelevantes. Por ejemplo, un caso de amplificación contextual podría transformar un prompt como 'Describe la importancia de la educación' en 'Describe la importancia de la educación en comunidades rurales con acceso limitado a tecnología.'

          2. **Reformulación de frases ambiguas**: Cambia términos subjetivos como 'de forma natural' o 'asume lo que creas pertinente' por indicaciones claras y objetivas. Por ejemplo, en lugar de 'Responde de forma natural', utiliza 'Proporciona una respuesta en lenguaje conversacional, sin tecnicismos, adecuada para un público general.' Si detectas otras áreas ambiguas, proporcionales una estructura concreta y funcional.

          3. **Adaptación al público objetivo**: Ajusta el lenguaje y el contenido del prompt para alinearse con las características y expectativas de audiencias de IA generativa, que pueden incluir:
            - **Desarrolladores y técnicos**: Prefieren lenguaje estructurado y especificaciones técnicas.
            - **Usuarios finales no especializados**: Necesitan instrucciones claras, accesibles y libres de jergas técnicas.

          4. **Métricas de evaluación**: Proporciona preguntas y criterios para analizar la calidad del prompt mejorado, como:
            - ¿El prompt incluye detalles suficientes para evitar respuestas ambiguas?
            - ¿El lenguaje es adecuado para la audiencia objetivo?
            - ¿El propósito del prompt está claramente definido?
            Utiliza una escala de 1 a 5 para medir la claridad y fluidez del texto final.

          5. **Integración de mejoras**: Realiza los cambios necesarios de forma fluida y asegúrate de que el resultado sea coherente con el propósito original del prompt, manteniendo un lenguaje claro y alineado con las expectativas de la audiencia objetivo.
  `,
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
    let response = await fetch(process.env.GPT_4O_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.GPT_4O_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        max_tokens: 1100,
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

    let data = await response.json();

    let agentAns = data.choices[0].message.content;

    let newMessages = [
      {
        role: "assistant",
        content: agentAns,
      },
      {
        role: "user",
        content: `
        Ahora genera la respuesta usando la información de tu mensaje anterior para llenar el siguiente JSON
        ## Estructuración del resultado en formato JSON.
        IMPORTANTE: Tu respuesta SIEMPRE debe seguir exactamente este formato JSON, sin excepciones en markdown:

        {
            "processedPrompt": string
            "doubts": string[]
        }`,
      },
    ];

    messages = [...messages, ...newMessages];

    response = await fetch(process.env.GPT_4O_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.GPT_4O_KEY,
      },
      body: JSON.stringify({
        messages: messages,
        max_tokens: 1100,
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

    data = await response.json();

    agentAns = data.choices[0].message.content;

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
