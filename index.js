const express = require("express");
const cors = require("cors");

const rateLimit = require("express-rate-limit");

const { getQuestions } = require("./promptCreator/openai/generate_questions");
const { generateTitle } = require("./promptCreator/openai/give_title");

const {
  generatePromptFromAnswers,
} = require("./promptCreator/openai/generate_prompt");
const {
  analyzePromptWithAzureCS,
  optimizePromptWithAgents,
} = require("./promptCreator/sistema_multiagente/optimize-prompt");

const {
  update_prompt,
  get_prompts,
  save_prompt,
  get_folder_tree_by_type,
} = require("./supabase/prompts_crud");

//const { authMiddleware } = require("./auth/auth_middleware");

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
app.use(express.json());
//app.use(authMiddleware);

// Rutas de ejemplo
app.get("/", (req, res) => {
  res.json({
    message: "¡Hola, mundo!",
  });
});

/**
 * ---------------------------------------------------
 * -------------- SISTEMA MEJORA BÁSICO --------------
 * ---------------------------------------------------
 */

/**
 * ---------------- Generar preguntas personalizadas ----------------
 */
app.post("/prompt-creator/get-custom-questions", async (req, res) => {
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

/**
 * -------------- Sistema mejora básica en base a preguntas --------------
 */
app.post("/prompt-creator/process-questions", async (req, res) => {
  try {
    const { answers, prompt, userId } = req.body;

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

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        error: "User id is required and must be a string",
      });
    }

    const response = await generatePromptFromAnswers(answers, prompt);

    const title = await generateTitle(response);
    const data = await save_prompt(response, userId, title, "prompt");
    const id = data[0].id;

    return res.json({
      response: response,
      id: id,
      title: title,
    });
  } catch (error) {
    console.error("Process questions endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * -------------------------------------------------
 * -------------- SISTEMA MULTIAGENTE --------------
 * -------------------------------------------------
 */

/**
 * ---------------- Generar preguntas personalizadas ----------------
 */
app.post("/prompt-generator/get-custom-questions", async (req, res) => {
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

/**
 * -------------- Sistema multiagente en base a preguntas --------------
 */
app.post("/prompt-generator/process-questions", async (req, res) => {
  try {
    const { answers, prompt, userId } = req.body;

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

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        error: "User id is required and must be a string",
      });
    }

    const response = await generatePromptFromAnswers(answers, prompt, true);

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

    const title = await generateTitle(optimizedPromptStructure.processedPrompt);

    const data = await save_prompt(
      optimizedPromptStructure.processedPrompt,
      userId,
      title,
      "agent"
    );
    const id = data[0].id;

    return res.json({
      response: optimizedPromptStructure.processedPrompt,
      doubts: optimizedPromptStructure.doubts,
      id: id,
      title: title,
    });
  } catch (error) {
    console.error("Process questions endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * -------------------------------------------------
 * -------------- MANEJO DE PROMPTS --------------
 * -------------------------------------------------
 */

app.post("/prompt-management/update-prompt", async (req, res) => {
  try {
    const { promptId, updates } = req.body;

    if (!promptId || typeof promptId !== "string") {
      return res.status(400).json({
        error: "Prompt ID is required and must be a string",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        error: "Updates object is required",
      });
    }

    const data = await update_prompt(promptId, updates);

    return res.json({ data });
  } catch (error) {
    console.error("Update prompt endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.post("/prompt-management/get-prompts", async (req, res) => {
  try {
    const { userId } = req.body;

    const data = await get_prompts(userId);

    return res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get prompts endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
    });
  }
});

/**
 * Endpoint para obtener el árbol de carpetas por tipo y usuario
 */
app.post("/folder-management/get-folder-tree", async (req, res) => {
  try {
    const { userId, folderType } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        error: "User ID is required and must be a string",
        success: false,
      });
    }

    const data = await get_folder_tree_by_type(userId, folderType || null);

    if (!data) {
      return res.status(500).json({
        error: "Error al obtener árbol de carpetas",
        success: false,
      });
    }

    return res.json({
      success: true,
      folderTree: data.folders,
    });
  } catch (error) {
    console.error("Get folder tree endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
    });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
