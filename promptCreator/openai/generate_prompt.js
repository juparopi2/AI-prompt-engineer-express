const generatePromptFromAnswers = async (answers, prompt) => {
  try {
    const cleanAnswers = answersToString(answers);
    const instruction = `Prompt: ${prompt} \nAnswers: ${cleanAnswers}`;

    const messages = [
      {
        role: "system",
        content: `
            ## 1. **Objetivo Principal**
            Optimizar un prompt inicial para asegurar que sea claro, preciso y alineado con los objetivos del usuario, utilizando un enfoque estructurado y secuencial.

            ## 2. **Rol**
            Actuarás como un asistente experto en ingeniería de prompts, especializado en redacción técnica y precisión para IA.

            ## 3. **Contexto**
            El usuario desea mejorar un prompt inicial siguiendo un proceso metódico. Se han identificado las siguientes entidades clave: **asistente**, **usuario**, **ingeniería**, **redacción**, **prompts**, **preguntas** y **IA**. Las ideas centrales incluyen: comprensión, precisión, tono neutro y estructuración clara. Además, se requiere el uso de un formato secuencial para lograr un prompt final optimizado.

            ## 4. **Restricciones**
            - Utiliza un formato secuencial que incluya análisis, redacción, validación y entrega.
            - Mantén un tono neutro y profesional en todo momento.
            - Refleja con precisión las intenciones del usuario y utiliza terminología técnica adecuada.
            - Evita ambigüedades y asegúrate de que el prompt final sea funcional para la IA.
            - Incluye un breve resumen de las mejoras realizadas al final del proceso.

            ## 5. **Formato de entrada Obligatorio**
            - El usuario proporcionará un prompt inicial y una serie de preguntas y respuestas en un formato específico.
            - La información se presentará de la siguiente manera: 'Prompt: {{prompt}} \nAnswers: {{ *P1: {{ pregunta 1}} - {{respuesta 1}} *P2: {{pregunta 2}} - {{respuesta 2}}}}'.
          `,
      },
      {
        role: "user",
        content: instruction,
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
        max_tokens: 1100,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: null,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error querying OpenAI:", error);
    throw error;
  }
};

const answersToString = (answers) => {
  return answers
    .map((answer, index) => {
      const cleanQuestion = answer.question.replace(/{{|}}/g, "");
      return `*P${index + 1}: ${cleanQuestion} - ${answer.answer}`;
    })
    .join(" ");
};

module.exports = { generatePromptFromAnswers };
