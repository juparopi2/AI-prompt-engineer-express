const { robustJSONParser } = require("../../verificador-json");

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
    const messages = [
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

        Paso 4: Estructuración del resultado en formato JSON.
        - Organiza el análisis siguiendo este esquema obligatorio: 
        {
          "issues": {
            "ambiguities": string[],
            "complexStructures": string[]
          },
          "suggestions": string[]
        }
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
      console.log("CLARITY AGENT : Error en la respuesta de OpenAI:", response);
      return null;
    }

    const data = await response.json();
    const agentAns = data.choices[0].message.content;

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
    const messages = [
      {
        role: "system",
        content: `Eres un especialista en lingüística computacional. Aplica las sugerencias de simplificación al prompt entregado por el usuario.
        En caso de que no haya sugerencias, no realices cambios.
        Si tienes dudas, puedes preguntar al usuario por la información que no puedas resolver por tu cuenta.
        Si no tienes dudas, puedes enviar una lista vacía.


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
        - La salida debe estar estrictamente en formato JSON.
        - No debe incluir información redundante o irrelevante.
        - El contenido debe alinearse completamente con el propósito original.
        - Incluir todas las ideas relevantes organizadas lógicamente.
        - Respetar los términos clave identificados: "lingüística computacional", "procesamiento", "interpretación", "sistemas automatizados", "simplificación", "reestructuración", "alineación", entre otros.

        ## 5. Flujo Lógico
        El flujo debe ser progresivo, desde el análisis del texto original hasta la entrega final optimizada, asegurando claridad y alineación con el objetivo.

        ## 6. Formato de Salida Obligatorio
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
            ${JSON.stringify(clarityResults.parsed)}
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
      console.log(
        "APPLY CLARITY AGENT : Error en la respuesta de OpenAI:",
        response
      );
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
