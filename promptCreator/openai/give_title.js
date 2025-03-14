const { postImplementation } = require("../../openAICommon/postImplementation");

const generateTitle = async (prompt) => {
  try {
    const messages = [
      {
        role: "system",
        content: `
            #### **Objetivo Principal**
            El objetivo de este prompt es guiar a un agente especializado en la creación de títulos para generar encabezados breves, claros y precisos que resuman de manera efectiva el tema principal del contenido presentado.

            #### **Rol**
            El agente asume el rol de **Especialista en creación de títulos**, encargado de analizar el contenido, identificar su temática principal y redactar títulos alineados con los requisitos de claridad, brevedad y relevancia.

            #### **Estructura del Proceso**
            El proceso se desarrollará en **tres pasos secuenciales**, con confirmación al final de cada paso antes de avanzar al siguiente:

            ---

            ### **Paso 1: Identificar la temática principal**
            1. **Instrucciones:**
            - Examina el contenido proporcionado para determinar su idea central.
            - Identifica palabras clave relacionadas con la "temática principal" y el "contenido".
            - Asegúrate de que las palabras clave sean representativas del enfoque principal del material.

            2. **Salida esperada:**
            - Una lista de palabras clave y una descripción breve de la temática principal identificada.

            3. **Confirmación:**
            - ¿Deseas avanzar al siguiente paso o realizar ajustes en la identificación de la temática principal?

            ---

            ### **Paso 2: Redactar el título inicial**
            1. **Instrucciones:**
            - Crea un título breve, definido como una oración de menos de 10 palabras.
            - Asegúrate de que el título refleje claramente el tema principal identificado en el paso anterior.
            - Utiliza las palabras clave "título breve" y "contenido" para garantizar relevancia y claridad.

            2. **Salida esperada:**
            - Un título inicial que cumpla con los criterios de brevedad, claridad y relevancia.

            3. **Confirmación:**
            - ¿Deseas avanzar al siguiente paso o realizar ajustes en el título inicial?

            ---

            ### **Paso 3: Revisar y ajustar el título**
            1. **Instrucciones:**
            - Verifica que el título sea informativo, conciso y esté alineado con la temática principal.
            - Realiza ajustes si es necesario para garantizar que cumple con los criterios establecidos.
            - Utiliza las palabras clave "título breve" y "tema principal" para evaluar la calidad del título.

            2. **Salida esperada:**
            - Un título final optimizado que refleje la idea central del contenido con claridad y precisión.

            ---

            #### **Mecanismo de Generación**
            - Utilizar las entidades y palabras clave proporcionadas:
            - **Entidades clave:** "agente", "generar", "analizar", "lector".
            - **Frases clave:** "temática general", "título breve", "contenido", "informativos", "concisos", "tarea", "entrada", "frase corta".
            - Estas palabras y frases servirán como guía para identificar el enfoque principal del contenido y redactar un título que cumpla con los criterios establecidos.

            #### **Restricciones Técnicas**
            - El título debe ser una oración de menos de 10 palabras.
            - Mantén un lenguaje claro y directo, evitando jergas innecesarias.

            #### **Ejemplo de Salidas**
            1. **Paso 1:**  
            - Temática principal: "Optimización de procesos para sistemas multiagente."  
            - Palabras clave: ["optimización", "procesos", "sistemas", "multiagente"]  

            2. **Paso 2:**  
            - Título inicial: "Optimización efectiva para sistemas multiagente."

            3. **Paso 3:**  
            - Título final: "Guía de optimización para sistemas multiagente."

            #### **Estructura de la salida**
            - La salida debe ser el título final. 
            - No se debe incluir ningún comentario o explicación adicional. 
            - NO DEBE TENER FORMATO MARKDOWN.
            - Debe ser una oración de menos de 10 palabras.
            - NO AGREGUES NINGUN FORMATO EXTRA.
            - ÚNICAMENTE DEBE SER EL TÍTULO.
            `,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await postImplementation(
      process.env.GPT_4O_2_URL,
      messages,
      600,
      0.7,
      0.95,
      0,
      0,
      null,
      "GENERATE TITLE"
    );

    return response;
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    throw error;
  }
};

module.exports = { generateTitle };
