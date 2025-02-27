const {
  clarityAgent,
  applyClaritySuggestions,
} = require("../agentes/clarityAgents");

const { contextAgent, integrateContext } = require("../agentes/contextAgents");

const { structureAgent } = require("../agentes/structureAgents");

const { orderAgent, applyOrderSuggestions } = require("../agentes/orderAgents");

// TODO Cambiar este llamado para que funciona en produccion
require("dotenv").config({ path: ".env.local" });

const {
  TextAnalyticsClient,
  AzureKeyCredential,
} = require("@azure/ai-text-analytics");

const commonAgentSchema = {
  type: "object",
  properties: {
    processedPrompt: { type: "string", required: true },
    doubts: { type: "array", required: true, items: { type: "string" } },
  },
};

const textAnalyticsClient = new TextAnalyticsClient(
  process.env.COGNITIVE_SERVICE_ENDPOINT,
  new AzureKeyCredential(process.env.COGNITIVE_SERVICE_KEY)
);

// Usa Cognitive Services para analizar el prompt y luego optimiza el prompt con agentes
const analyzePromptWithAzureCS = async (prompt) => {
  try {
    const entityResults = await textAnalyticsClient.recognizeEntities([prompt]);
    const keyPhraseResults = await textAnalyticsClient.extractKeyPhrases([
      prompt,
    ]);

    const entities =
      entityResults[0]?.entities.map((entity) => ({
        text: entity.text,
        category: entity.category,
        subCategory: entity.subCategory || null,
        confidenceScore: entity.confidenceScore,
      })) || [];

    const keyPhrases = keyPhraseResults[0]?.keyPhrases || [];

    return {
      entities: entities,
      keyPhrases: keyPhrases,
      language: await detectLanguage(prompt),
      sentiment: await analyzeSentiment(prompt),
    };
  } catch (error) {
    console.error("Error al analizar métricas:", error.message);
    throw new Error("Error en Text Analytics");
  }
};

// Usa metricas y distintos agentes para optimizar el prompt
const optimizePromptWithAgents = async (prompt, metrics) => {
  let promptOptimization = {
    processedPrompt: prompt,
    doubts: [],
  };

  // Agente de Claridad: analiza ambigüedades y propone sugerencias
  const clarityResults = await clarityAgent(promptOptimization, metrics);
  promptOptimization = await applyClaritySuggestions(
    promptOptimization,
    clarityResults,
    commonAgentSchema
  );

  // Agente de Enriquecimiento Contextual: integra información complementaria
  const contextResults = await contextAgent(promptOptimization, metrics);
  promptOptimization = await integrateContext(
    promptOptimization,
    contextResults,
    commonAgentSchema
  );

  // Agente de generación de pasos: divide el prompt en pasos para que sea iterativo

  const orderSuggestions = await orderAgent(promptOptimization, metrics);
  promptOptimization = await applyOrderSuggestions(
    promptOptimization,
    orderSuggestions,
    commonAgentSchema
  );

  // Agente de Optimización Estructural: reorganiza la estructura del prompt
  promptOptimization = await structureAgent(
    promptOptimization,
    metrics
  );

  return promptOptimization;
};

async function detectLanguage(prompt) {
  const languageResult = await textAnalyticsClient.detectLanguage([prompt]);
  return languageResult[0]?.primaryLanguage.name || "unknown";
}

async function analyzeSentiment(prompt) {
  const sentimentResult = await textAnalyticsClient.analyzeSentiment([prompt]);
  return sentimentResult[0]?.sentiment || "neutral";
}

module.exports = { analyzePromptWithAzureCS, optimizePromptWithAgents };
