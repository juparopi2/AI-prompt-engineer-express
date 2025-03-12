const { robustJSONParser } = require("../../verificador-json");
const { postImplementation } = require("../../openAICommon/postImplementation");
const clarityResponseSchema = {
  type: "object",
  properties: {
    issues: {
      type: "object",
      required: true,
      properties: {
        ambiguities: {
          type: "array",
          required: true,
          items: { type: "string" },
        },
        complexStructures: {
          type: "array",
          required: true,
          items: { type: "string" },
        },
      },
    },
    suggestions: { type: "array", items: { type: "string" } },
  },
};

// Ejemplo de implementación del agente de claridad que utiliza análisis
async function clarityAgent(promptOptimization, metrics) {
  try {
    let messages = [
      {
        role: "system",
        content: `            
        Eres un experto en lingüística computacional. Realiza un análisis detallado y estructurado del siguiente texto para identificar problemas de claridad y comprensión. Sigue los pasos establecidos a continuación para garantizar un análisis completo y ordenado:

        Paso 1: Identificación de términos ambiguos o polisémicos.
        - Detecta palabras o frases en el texto que puedan tener múltiples significados o interpretaciones.
        - Elabora una lista numerada de los términos identificados como ambiguos o polisémicos.

        Paso 2: Detección de estructuras sintácticas complejas.
        - Revisa el texto en busca de oraciones cuya longitud o complejidad gramatical puedan dificultar la comprensión.
        - Marca dichas estructuras con ** en el texto original para resaltarlas.

        Paso 3: Proposición de alternativas simplificadas.
        - Ofrece sugerencias o alternativas de aplicación para cada término ambiguo o estructura compleja detectada.
        - Asegúrate de que las alternativas propuestas conserven el propósito original del texto.
        - Llena las categorías del JSON con los datos obtenidos en los pasos anteriores.

        Asegúrate de completar cada paso antes de avanzar al siguiente y de realizar un análisis optimizado para su uso en el contexto de procesamiento de lenguaje natural (PLN).
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

    let agentAns = postImplementation(
      process.env.GPT_4O_URL,
      messages,
      1100,
      0.7,
      0.95,
      0,
      0,
      null,
      "CLARITY AGENT 0"
    );

    let newMessage = {
      role: "assistant",
      content: `${agentAns}`,
    };

    let newUserMessage = {
      role: "user",
      content: `{
      Ahora genera la respuesta usando la información de tu mensaje anterior para llenar el siguiente JSON
      ## Estructuración del resultado en formato JSON.
        - Organiza el análisis siguiendo este esquema obligatorio en JSON Markdown: 
        {
          "issues": {
            "ambiguities": string[],
            "complexStructures": string[]
          },
          "suggestions": string[]
        }
          `,
    };

    messages = [...messages, newMessage, newUserMessage];

    agentAns = postImplementation(
      process.env.GPT_4O_URL,
      messages,
      1100,
      0.7,
      0.95,
      0,
      0,
      null,
      "CLARITY AGENT 1"
    );

    const parsedResponse = robustJSONParser(agentAns, clarityResponseSchema);

    if (!parsedResponse) {
      console.log(
        "CLARITY AGENT : Error en el parsing de la respuesta de parser:",
        agentAns
      );
      return null;
    }

    return parsedResponse;
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    throw error;
  }
}

async function applyClaritySuggestions(
  promptOptimization,
  clarityResults,
  commonAgentSchema
) {
  if (
    !clarityResults ||
    !clarityResults.success ||
    !clarityResults.validSchema
  ) {
    console.log(
      "APPLY CLARITY AGENT : Error en los resultados de claridad:",
      clarityResults
    );
    return promptOptimization;
  }
  try {
    let messages = [
      {
        role: "system",
        content: `
        ## 1. Objetivo Principal
        Optimizar un prompt original para que sea claro, conciso, exhaustivo y alineado al propósito inicial, garantizando su utilidad para la audiencia objetivo especialmente la claridad del prompt.

        ## 2. Rol
        Actuar como un especialista en diseño de prompts con experiencia en lingüística computacional y procesamiento de lenguaje natural, capaz de analizar, reestructurar y mejorar prompts basados en requerimientos específicos.

        ## 3. Contexto
        El prompt original contiene múltiples elementos que requieren análisis. Además, se deben considerar las sugerencias de simplificación proporcionadas por un agente especializado en claridad.

        ### Ejemplo de Pasos a Seguir
        1. **Comprensión:** Analizar el propósito, sugerencias y requisitos del prompt original.
        2. **Identificación de Problemas:** Detectar redundancias, aspectos confusos o información faltante.
        3. **Propuesta de Mejora:** Redactar una versión optimizada que sea clara, lógica y libre de redundancias.
        4. **Verificación de Cumplimiento:** Comparar la mejora con los objetivos iniciales y realizar ajustes si es necesario.
        5. **Generación de Respuesta Final:** Entregar el prompt optimizado en formato JSON y generar dudas si las hay.

        ## 4. Restricciones
        - No debe incluir información redundante o irrelevante.
        - El contenido debe alinearse completamente con el propósito original.
        - Incluir todas las ideas relevantes organizadas lógicamente.
        - Respetar los términos clave identificados: "lingüística computacional", "procesamiento", "interpretación", "sistemas automatizados", "simplificación", "reestructuración", "alineación", entre otros.

        ## 5. Flujo Lógico
        El flujo debe ser progresivo, desde el análisis del texto original hasta la entrega final optimizada, asegurando claridad y alineación con el objetivo.

        ## 6. Dudas
        En caso de que existan dudas sobre la información proporcionada, se deben generar preguntas específicas para aclarar los puntos conflictivos.
        `,
      },
      {
        role: "user",
        content: `
        - Considera las siguientes sugerencias:
            ${JSON.stringify(clarityResults.parsed)}
        - Prompt: 
        ${promptOptimization.processedPrompt}
        `,
      },
    ];

    let agentAns = postImplementation(
      process.env.GPT_4O_URL,
      messages,
      1100,
      0.7,
      0.95,
      0,
      0,
      null,
      "APPLY CLARITY AGENT 0"
    );

    const newMessages = [
      {
        role: "assistant",
        content: agentAns,
      },
      {
        role: "user",
        content: `
        Ahora genera la respuesta usando la información de tu mensaje anterior para llenar el siguiente JSON. 
        Debes generar un prompt optimizado enfocandote en la claridad y en las recomendaciones de tu mensaje anterior, ademas de una lista de dudas si las hay. 
        ## Estructuración del resultado en formato JSON.
        IMPORTANTE: Tu respuesta SIEMPRE debe seguir exactamente este formato JSON, sin excepciones en markdown:

        {
            "processedPrompt": string
            "doubts": string[]
        }`,
      },
    ];

    messages = [...messages, ...newMessages];

    agentAns = postImplementation(
      process.env.GPT_4O_URL,
      messages,
      1100,
      0.7,
      0.95,
      0,
      0,
      null,
      "APPLY CLARITY AGENT 1"
    );

    const parsedResponse = robustJSONParser(agentAns, commonAgentSchema);

    if (
      !parsedResponse ||
      !parsedResponse.success ||
      !parsedResponse.validSchema
    ) {
      console.log(
        "APPLY CLARITY AGENT : Error en el parsing de la respuesta de parser:",
        agentAns
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

module.exports = { clarityAgent, applyClaritySuggestions };
