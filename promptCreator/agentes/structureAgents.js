const { robustJSONParser } = require("../../verificador-json");
const { postImplementation } = require("../../openAICommon/postImplementation");

const structureResponseSchema = {
  type: "object",
  properties: {
    restructuredPrompt: { type: "string", required: true },
  },
};

async function structureAgent(promptOptimization, metrics) {
  try {
    let messages = [
      {
        role: "system",
        content: `
        ## 1. **Propósito del Prompt**
        El objetivo principal de este prompt es proporcionar una entrada clara, detallada y estructurada para un sistema multiagente compuesto por modelos de IA generativa. El prompt debe facilitar la colaboración entre agentes especializados en diferentes tareas, asegurando precisión y alineación con los requisitos técnicos.

        ## 2. **Rol del Usuario**
        Asumes el papel de un arquitecto de información especializado en diseño de prompts para sistemas multiagente. Tu tarea es definir una estructura optimizada que permita a los agentes interpretar e implementar las instrucciones de manera efectiva.

        ## 3. **Contexto del Sistema Multiagente**
        - Este sistema multiagente está compuesto por múltiples modelos de IA generativa que colaboran en tareas específicas. Por ejemplo:
        - Un agente que genera contenido técnico, como documentación o código.
        - Otro agente que analiza y valida la información generada por otros modelos, asegurando precisión y cumplimiento normativo.
        - Un agente adicional que adapta el contenido al público objetivo, ajustando el nivel de tecnicismo según las necesidades del usuario final.

        ## 4. **Estructura del Prompt**
        Para garantizar claridad y precisión, sigue esta estructura al diseñar el prompt:
        1. **Objetivo Principal:** Define claramente el propósito del prompt.
        2. **Rol:** Especifica el rol o perspectiva desde la cual se deben interpretar las instrucciones.
        3. **Contexto:** Proporciona detalles sobre el entorno multiagente y las interacciones esperadas entre los agentes.
        4. **Ejemplos:** Incluye ejemplos representativos de entradas y salidas esperadas.
        5. **Restricciones:** Define cualquier limitación técnica o de estilo que deba respetarse.

        ## 5. **Restricciones Técnicas**
        - Usa un lenguaje técnico y preciso, pero evita jergas innecesarias.
        - Emplea formato **MarkDown** como estándar principal para la presentación del contenido.
        - Mantén un alto nivel de detalle en las instrucciones para garantizar una interpretación adecuada por parte de los agentes.
        - Asegúrate de que las salidas sean consistentes y alineadas con las tareas específicas de cada agente.

        ## 6. **Dudas**:
          - En caso de que existan dudas sobre la información proporcionada, se deben generar preguntas específicas para aclarar los puntos conflictivos.
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
    let agentAns = await postImplementation(
      process.env.GPT_4O_2_URL,
      messages,
      1100,
      0.7,
      0.95,
      0,
      0,
      null,
      "STRUCTURE AGENT 0"
    );

    const newMessages = [
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
          "restructuredPrompt": string,
          }
        `,
      },
    ];

    messages = [...messages, ...newMessages];

    agentAns = await postImplementation(
      process.env.GPT_4O_2_URL,
      messages,
      1100,
      0.7,
      0.95,
      0,
      0,
      null,
      "STRUCTURE AGENT 1"
    );

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
