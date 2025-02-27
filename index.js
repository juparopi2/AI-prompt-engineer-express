const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { getQuestions } = require("./promptCreator/openai/generate_questions");
const {
  generatePromptFromAnswers,
} = require("./promptCreator/openai/generate_prompt");
const {
  analyzePromptWithAzureCS,
  optimizePromptWithAgents,
} = require("./promptCreator/sistema_multiagente/optimize-prompt");

// TODO Cambiar este llamado para que funcione en producción
require("dotenv").config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limitar cada IP a 100 solicitudes por ventana de tiempo
  standardHeaders: true, // Incluir información del límite en las cabeceras `RateLimit-*`
  legacyHeaders: false, // Desactivar las cabeceras `X-RateLimit-*`
});

app.use(limiter);

// Rutas de ejemplo
app.get("/", (req, res) => {
  res.json({
    message: "¡Hola, mundo!",
  });
});

// New chat endpoint
app.post("/get-custom-questions", express.json(), async (req, res) => {
  try {
    const { userInput, aiAgent } = req.body;

    if (!userInput || typeof userInput !== "string") {
      return res.status(400).json({
        error: "User input is required and must be a string",
      });
    }

    if (!aiAgent || typeof aiAgent !== "string") {
      return res.status(400).json({
        error: "AI agent is required and must be a string",
      });
    }

    const response = await getQuestions(userInput, aiAgent);
    res.json({ response });
  } catch (error) {
    console.error("Custom questions endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.post("/process-answers", express.json(), async (req, res) => {
  try {
    const { answers, prompt } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: "Answers array is required",
      });
    }

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Prompt is required and must be a string",
      });
    }

    const response = await generatePromptFromAnswers(answers, prompt);

    // Lógica inicial: enviar a Azure Cognitive Services
    const metrics = await analyzePromptWithAzureCS(response);

    // // Optimizar prompt con agentes
    const optimizedPromptStructure = await optimizePromptWithAgents(
      response,
      metrics
    );

    // // Decidir flujo basado en métricas
    // if (metrics.clarity < 7.5 || metrics.vagueness > 3.0) {
    //   res.json({ response: optimizedPrompt });
    // } else {
    //   res.json({ response });
    // }

    return res.json({
      response: optimizedPromptStructure.processedPrompt,
      doubts: optimizedPromptStructure.doubts,
    });
  } catch (error) {
    console.error("Process questions endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
