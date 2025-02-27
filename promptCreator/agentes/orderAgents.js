const { robustJSONParser } = require("../../verificador-json");

const orderAgentSchema = {
  type: "object",
  properties: {
    require_cambio: { type: "boolean", required: true },
    justificacion: { type: "string", required: true },
    numero_recomendado_de_pasos: { type: "number", required: true },
    mecanismo_de_generacion: {
      type: "object",
      properties: {
        tipo: { type: "string", required: true },
        palabra_clave: { type: "string", required: true },
        instruccion_de_uso: { type: "string", required: true },
      },
    },
    estructura_secuencial: {
      type: "array",
      required: true,
      items: {
        type: "object",
        properties: {
          paso_nombre: { type: "string", required: true },
          descripcion: { type: "string", required: true },
          contenido_sugerido: { type: "string", required: true },
        },
      },
    },
  },
};

// Ejemplo de implementación del agente de claridad que utiliza análisis
async function orderAgent(promptOptimization, metrics) {
  try {
    const messages = [
      {
        role: "system",
        content: `# Agente de Análisis y Recomendación de Estructura por Pasos

          ## ObjetivoPrincipal
          Tu función es analizar solicitudes de los usuarios y determinar si la tarea solicitada requiere una estructura secuencial por pasos o capítulos. 
          Debes recomendar la mejor forma de estructurar la respuesta cuando se necesite una secuencia lógica.

          ## Tus Responsabilidades

          1. Analizar la complejidad de la tarea solicitada
          2. Determinar si la tarea se beneficiaría de una estructura secuencial
          3. Recomendar el número óptimo de pasos o capítulos
          4. Sugerir métodos para la generación secuencial (palabras clave, comandos, etc.)
          5. Proporcionar justificación para tus recomendaciones

          ## Proceso de Análisis

          Cuando recibas una solicitud:

          - Identifica si es un proyecto complejo que requiere múltiples componentes
          - Evalúa si hay un orden lógico o cronológico inherente
          - Determina si la división en pasos o capítulos mejorará la comprensión
          - Considera el formato final del entregable (documento, guía, libro, etc.)

          ## Criterios para Recomendar Estructura Secuencial

          Recomienda una estructura por pasos cuando:
          - La tarea involucre procesos que deben seguirse en orden específico
          - El resultado esperado sea extenso y se beneficie de una organización por secciones
          - La información deba presentarse gradualmente para facilitar el aprendimiento
          - El usuario necesite resultados parciales antes del producto final

          
          ## Ejemplos de Aplicación
          
          **Ejemplo 1: Libro de cocina**
          - Recomendación: Estructura por capítulos temáticos
          - Justificación: Un libro de cocina se beneficia de la organización por categorías de platos
          - Número de capítulos: 6-8 (Aperitivos, Ensaladas, Platos principales, etc.)
          - Mecanismo: Incluir "SIGUIENTE CAPÍTULO" al final de cada sección para continuar
          
          **Ejemplo 2: Tutorial de programación**
          - Recomendación: Estructura por pasos progresivos
          - Justificación: El aprendizaje de programación requiere construir sobre conceptos previos
          - Número de pasos: 5-7 (desde conceptos básicos hasta aplicación completa)
          - Mecanismo: Incluir "CONTINUAR" para avanzar al siguiente paso
          
          ## Consideraciones Finales
          
          - Adapta tus recomendaciones al nivel de experiencia del usuario
          - Sugiere métodos para verificar la finalización de cada paso antes de continuar
          - Recomienda incluir resúmenes al final de cada sección cuando sea apropiado
          ## Formato de tus Recomendaciones
  
         ## Formato de Salida Obligatorio
          IMPORTANTE: Tu respuesta SIEMPRE debe seguir exactamente este formato JSON, sin excepciones en markdown:
          {
            "require_cambio": boolean,
            "justificacion": "string",
            "numero_recomendado_de_pasos": number,
            "mecanismo_de_generacion": {
              "tipo": "string",
              "palabra_clave": "string",
              "instruccion_de_uso": "string"
            },
            "estructura_secuencial": [
              {
                "paso_nombre": "string",
                "descripcion": "string",
                "contenido_sugerido": "string"
              }
            ]
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
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null,
      }),
    });

    if (!response.ok) {
      console.log("ORDER AGENT : Error querying OpenAI:", response);
      return null;
    }

    const data = await response.json();
    const agentAns = data.choices[0].message.content;

    const parsedResponse = robustJSONParser(agentAns, orderAgentSchema);

    return parsedResponse;
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    throw error;
  }
}

async function applyOrderSuggestions(
  promptOptimization,
  orderSuggestions,
  commonAgentSchema
) {
  if (
    !orderSuggestions ||
    !orderSuggestions.success ||
    !orderSuggestions.validSchema
  ) {
    console.log(
      "APPLY ORDER AGENT : Error applying order suggestions:",
      orderSuggestions
    );
    return promptOptimization;
  }
  try {
    const messages = [
      {
        role: "system",
        content: `
        # Agente Implementador de Estructura Secuencial

        ## Objetivo Principal
        Tu función es implementar las recomendaciones de estructura proporcionadas por el Agente de Análisis y transformar el prompt original del usuario en un prompt estructurado y optimizado. Debes interpretar correctamente el formato JSON recibido y aplicar las recomendaciones de manera efectiva.

        ## Tus Responsabilidades

        1. Recibir e interpretar el JSON de recomendaciones generado por el Agente de Análisis
        2. Analizar el prompt original del usuario
        3. Implementar la estructura recomendada cuando sea necesario
        4. Incorporar los mecanismos de generación secuencial sugeridos
        5. Mantener la intención y requisitos originales del usuario
        6. Entregar un prompt final optimizado y estructurado

        ## Proceso de Implementación

        1. **Recepción de datos**:
          - Prompt original del usuario
          - JSON de recomendaciones del Agente de Análisis

        2. **Verificación de requerimiento secuencial**:
          - Verifica el campo 'requiere_estructura_secuencial' en el JSON
          - Procesa la implementación según sea true o false

        3. **Estructuración del prompt**:
          - Si 'requiere_estructura_secuencial' es true:
            - Implementa la estructura por pasos o capítulos recomendada
            - Incluye los mecanismos de generación secuencial
          - Si 'requiere_estructura_secuencial' es false:
            - Optimiza el prompt como una unidad cohesiva
            - Incorpora las recomendaciones de estructura interna no secuencial

        ## Formato de Salida Obligatorio

        Formato de Salida Obligatorio
          IMPORTANTE: Tu respuesta SIEMPRE debe seguir exactamente este formato JSON, sin excepciones en markdown:
         {
            "processedPrompt": string
            "doubts": string[]
        }
        `,
      },
      {
        role: "user",
        content: `
          - Considera las recomendaciones de estructura secuencial:
            ${JSON.stringify(orderSuggestions.parsed)}
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
      console.log("APPLY ORDER AGENT : Error querying OpenAI:", response);
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
        "APPLY ORDER AGENT : Error parsing response:",
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

module.exports = { orderAgent, applyOrderSuggestions };
