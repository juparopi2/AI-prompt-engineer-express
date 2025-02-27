/**
 * Parsea una cadena que debería contener JSON, intentando varios métodos de corrección
 * para manejar diferentes problemas de formato comunes.
 *
 * @param {string} text - El texto que contiene el supuesto JSON
 * @param {Object} [schema] - Esquema opcional para validar la estructura esperada
 * @returns {Object} El objeto JSON parseado o null si no fue posible parsearlo
 */
function robustJSONParser(text, schema = null) {
  // Resultados del proceso
  const result = {
    parsed: null, // Objeto JSON parseado
    success: false, // Indica si el parseo fue exitoso
    method: null, // Método que funcionó
    error: null, // Error encontrado
    validSchema: null, // Indica si cumple con el esquema
  };

  // Array de métodos de parseo, ordenados del más simple al más complejo
  const parsingMethods = [
    // Método 1: Intentar parseo directo
    function directParse() {
      try {
        result.parsed = JSON.parse(text);
        result.method = "direct";
        return true;
      } catch (e) {
        return false;
      }
    },

    // Método 2: Extraer JSON de bloques de código markdown
    function extractFromMarkdown() {
      try {
        // Buscar bloques de código markdown para json
        const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
        const matches = text.matchAll(markdownRegex);

        for (const match of matches) {
          if (match[1]) {
            try {
              result.parsed = JSON.parse(match[1]);
              result.method = "markdown";
              return true;
            } catch (e) {
              // Continuar con la siguiente coincidencia
            }
          }
        }
        return false;
      } catch (e) {
        return false;
      }
    },

    // Método 3: Buscar JSON dentro del texto usando expresiones regulares
    function extractJsonWithRegex() {
      try {
        // Busca bloques que parezcan JSON entre llaves {}
        const jsonRegex = /{[\s\S]*?}/g;
        const matches = text.match(jsonRegex);

        if (matches && matches.length > 0) {
          // Intenta con cada coincidencia, de la más larga a la más corta (asumiendo que más largo = más completo)
          const sortedMatches = matches.sort((a, b) => b.length - a.length);

          for (const jsonCandidate of sortedMatches) {
            try {
              result.parsed = JSON.parse(jsonCandidate);
              result.method = "regex";
              return true;
            } catch (e) {
              // Continuar con la siguiente coincidencia
            }
          }
        }
        return false;
      } catch (e) {
        return false;
      }
    },

    // Método 4: Corregir comillas y caracteres de escape incorrectos
    function fixQuotesAndEscapes() {
      try {
        // Reemplazar comillas simples por dobles en claves y valores
        let fixedText = text.replace(/(\w+)'(\s*):(\s*)/g, '$1"$2:$3');
        fixedText = fixedText.replace(/:(\s*)'([^']*?)'/g, ':$1"$2"');

        // Reemplazo de secuencias Unicode incorrectas
        fixedText = fixedText.replace(/\\u([0-9a-fA-F]{4})/g, (match, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        );

        // Intenta parsear la versión corregida
        try {
          result.parsed = JSON.parse(fixedText);
          result.method = "fixQuotes";
          return true;
        } catch (e) {
          return false;
        }
      } catch (e) {
        return false;
      }
    },

    // Método 5: Eliminar comentarios y texto adicional
    function removeCommentsAndExtraText() {
      try {
        // Eliminar líneas que parecen comentarios
        let lines = text
          .split("\n")
          .filter(
            (line) =>
              !line.trim().startsWith("//") &&
              !line.trim().startsWith("#") &&
              !line.trim().startsWith("/*")
          );

        // Unir las líneas de nuevo
        let cleanedText = lines.join("\n");

        // Encontrar el primer { y último }
        const startIdx = cleanedText.indexOf("{");
        const endIdx = cleanedText.lastIndexOf("}") + 1;

        if (startIdx >= 0 && endIdx > startIdx) {
          cleanedText = cleanedText.substring(startIdx, endIdx);

          try {
            result.parsed = JSON.parse(cleanedText);
            result.method = "removeComments";
            return true;
          } catch (e) {
            return false;
          }
        }
        return false;
      } catch (e) {
        return false;
      }
    },

    // Método 6: Corregir comas y corchetes mal formados
    function fixCommasAndBrackets() {
      try {
        let fixedText = text;

        // Eliminar comas extra al final de listas u objetos
        fixedText = fixedText.replace(/,(\s*[}\]])/g, "$1");

        // Agregar comillas a claves sin comillas
        fixedText = fixedText.replace(
          /(\{|\,)(\s*)([a-zA-Z0-9_]+)(\s*):/g,
          '$1$2"$3"$4:'
        );

        // Balancear llaves y corchetes
        let balanced = "";
        try {
          // Encontrar el primer { y extraer hasta encontrar } balanceado
          const startIdx = fixedText.indexOf("{");
          if (startIdx >= 0) {
            let depth = 0;
            let inString = false;
            let escape = false;

            for (let i = startIdx; i < fixedText.length; i++) {
              const char = fixedText[i];

              if (escape) {
                escape = false;
              } else if (char === "\\" && inString) {
                escape = true;
              } else if (char === '"') {
                inString = !inString;
              } else if (!inString) {
                if (char === "{" || char === "[") depth++;
                else if (char === "}" || char === "]") depth--;
              }

              balanced += char;

              if (depth === 0 && (char === "}" || char === "]")) {
                break;
              }
            }

            try {
              result.parsed = JSON.parse(balanced);
              result.method = "balanceBrackets";
              return true;
            } catch (e) {
              return false;
            }
          }
        } catch (e) {
          return false;
        }

        // Si no funcionó lo anterior, intenta con el texto corregido
        try {
          result.parsed = JSON.parse(fixedText);
          result.method = "fixCommas";
          return true;
        } catch (e) {
          return false;
        }
      } catch (e) {
        return false;
      }
    },

    // Método 7: Usar eval() como último recurso (con cuidado)
    function useEvalAsLastResort() {
      try {
        // Esta es una opción de último recurso que puede ser insegura
        // Solo usar si el texto viene de fuentes confiables (tus propios agentes)

        // Intentar encerrar el texto en paréntesis para que eval lo interprete como objeto
        const safeText = "(" + text + ")";

        // Usar Function constructor es más seguro que eval directo
        const fn = new Function("return " + safeText);
        const evaluated = fn();

        if (evaluated && typeof evaluated === "object") {
          result.parsed = evaluated;
          result.method = "eval";
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    },
  ];

  // Intenta cada método hasta que uno funcione
  for (const method of parsingMethods) {
    if (method()) {
      result.success = true;
      break;
    }
  }

  // Si no tuvo éxito, registra el error
  if (!result.success) {
    result.error = "No se pudo parsear el texto como JSON con ningún método";
    return result;
  }

  // Validación de esquema si se proporciona
  if (schema && result.parsed) {
    result.validSchema = validateAgainstSchema(result.parsed, schema);
  }

  return result;
}

/**
 * Valida un objeto JSON contra un esquema simple
 *
 * @param {Object} obj - El objeto JSON a validar
 * @param {Object} schema - El esquema contra el que validar
 * @returns {boolean} - True si cumple con el esquema, false en caso contrario
 */
function validateAgainstSchema(obj, schema) {
  // Si el esquema es un array de posibles estructuras, intentamos con cada una
  if (Array.isArray(schema)) {
    return schema.some((s) => validateAgainstSchema(obj, s));
  }

  // Si el esquema es una función de validación personalizada
  if (typeof schema === "function") {
    return schema(obj);
  }

  // Si el esquema es un objeto que describe la estructura esperada
  if (typeof schema === "object" && schema !== null) {
    // Caso especial para arrays
    if (schema.type === "array" && Array.isArray(obj)) {
      // Si no hay definición de items, simplemente verificamos que sea un array
      if (!schema.items) {
        return true;
      }

      // Validamos cada elemento del array contra el esquema de items
      if (schema.items) {
        // Si todos los elementos deben cumplir el mismo esquema
        if (!Array.isArray(schema.items)) {
          return obj.every((item) => validateAgainstSchema(item, schema.items));
        }
        // Si cada elemento tiene su propio esquema (tuple validation)
        else {
          if (schema.strictLength && obj.length !== schema.items.length) {
            return false;
          }

          // Validamos cada elemento con su esquema correspondiente
          return obj.every((item, index) => {
            // Si hay más elementos que esquemas, usamos el último esquema para los restantes
            const itemSchema =
              index < schema.items.length
                ? schema.items[index]
                : schema.items[schema.items.length - 1];

            return validateAgainstSchema(item, itemSchema);
          });
        }
      }

      return true;
    }

    // Verificación de tipo primitivo
    if (schema.type && schema.type !== "object" && schema.type !== "array") {
      const typeCheck =
        schema.type === "number"
          ? typeof obj === "number" && !isNaN(obj)
          : typeof obj === schema.type;

      if (!typeCheck) {
        return false;
      }
    }

    // Para objetos, verificamos cada propiedad
    if (
      schema.type === "object" ||
      (!schema.type && typeof obj === "object" && !Array.isArray(obj))
    ) {
      // Verifica que todas las propiedades requeridas existan
      for (const key in schema.properties || schema) {
        const propSchema = schema.properties
          ? schema.properties[key]
          : schema[key];

        // Saltamos si la propiedad no es un esquema válido
        if (typeof propSchema !== "object" || propSchema === null) {
          continue;
        }

        if (
          propSchema.required &&
          (obj[key] === undefined || obj[key] === null)
        ) {
          return false;
        }

        // Si la propiedad existe, verifica su valor
        if (obj[key] !== undefined) {
          // Verifica el tipo o estructura anidada
          if (!validateAgainstSchema(obj[key], propSchema)) {
            return false;
          }

          // Verifica valores enumerados
          if (propSchema.enum && !propSchema.enum.includes(obj[key])) {
            return false;
          }
        }
      }

      return true;
    }

    // Si llegamos aquí, verificamos el tipo general
    return schema.type ? typeof obj === schema.type : true;
  }

  // Si el esquema es un string que describe el tipo esperado
  if (typeof schema === "string") {
    return typeof obj === schema;
  }

  // Por defecto
  return true;
}

const taskListSchema = {
  type: "object",
  properties: {
    agent_id: { type: "string", required: true },
    timestamp: { type: "number", required: true },
    tasks: {
      type: "array",
      required: true,
      items: {
        type: "object",
        properties: {
          id: { type: "string", required: true },
          description: { type: "string", required: true },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
            required: true,
          },
          completed: { type: "boolean", required: true },
          assigned_to: { type: "string", required: false },
          due_date: { type: "string", required: false },
        },
      },
    },
    metadata: {
      type: "object",
      required: false,
      properties: {
        total_tasks: { type: "number", required: false },
        pending_tasks: { type: "number", required: false },
      },
    },
  },
};

// Exportar funciones
module.exports = {
  robustJSONParser,
  validateAgainstSchema,
};
