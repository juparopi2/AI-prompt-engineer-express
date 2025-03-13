const { supabase } = require("./supabase_client");

const save_prompt = async (prompt, user_id, title, type) => {
  const { data, error } = await supabase
    .from("prompt")
    .insert({ content: prompt, user_id: user_id, type: type, title: title })
    .select();

  if (error) {
    console.error("Error al guardar prompt:", error);
    return null;
  }
  return data;
};

const buildFolderHierarchy = (folderId, folderMap, folders) => {
  const folder = folderMap[folderId];
  if (!folder) return null;

  return {
    ...folder,
    prompts: [],
    subfolders: folders
      .filter((f) => f.parent_folder_id === folderId)
      .map((f) => buildFolderHierarchy(f.id, folderMap, folders))
      .filter(Boolean),
  };
};

const assignPromptsToFolders = (folder, prompts, promptFolderMap) => {
  // Asignar prompts a la carpeta actual
  folder.prompts = prompts.filter((prompt) =>
    promptFolderMap[prompt.id]?.includes(folder.id)
  );

  // Recursivamente asignar prompts a las subcarpetas
  folder.subfolders = folder.subfolders.map((subfolder) => {
    return assignPromptsToFolders(subfolder, prompts, promptFolderMap);
  });

  return folder;
};

const getAllParentFolderIds = async (
  folderIds,
  accumulatedIds = new Set(),
  user_id
) => {
  if (folderIds.length === 0) return Array.from(accumulatedIds);

  const { data: currentFolders, error } = await supabase
    .from("folder")
    .select("id, parent_folder_id")
    .eq("user_id", user_id)
    .in("id", folderIds);

  if (error) throw error;
  if (!currentFolders || currentFolders.length === 0)
    return Array.from(accumulatedIds);

  // Agregar los IDs actuales al conjunto
  currentFolders.forEach((folder) => accumulatedIds.add(folder.id));

  // Recopilar los IDs de carpetas padre que aún no hemos procesado
  const parentIds = currentFolders
    .map((f) => f.parent_folder_id)
    .filter((id) => id && !accumulatedIds.has(id));

  // Llamada recursiva para obtener los padres de los padres
  if (parentIds.length > 0) {
    await getAllParentFolderIds(parentIds, accumulatedIds, user_id);
  }

  return Array.from(accumulatedIds);
};

const get_prompts = async (user_id) => {
  try {
    // 1. Obtener todos los prompts del usuario
    const { data: prompts, error: promptsError } = await supabase
      .from("prompt")
      .select(
        "id, created_at, favorite, user_id, updated_at, content, type, pinned, title"
      )
      .eq("user_id", user_id);

    if (promptsError) throw promptsError;

    // 2. Obtener las relaciones prompt-folder
    const { data: promptFolders, error: promptFoldersError } = await supabase
      .from("promptFolder")
      .select("created_at, prompt_id, folder_id, user_id")
      .eq("user_id", user_id);

    if (promptFoldersError) throw promptFoldersError;

    // 3. Obtener todas las carpetas necesarias, incluyendo la jerarquía completa
    const initialFolderIds = [
      ...new Set(promptFolders.map((pf) => pf.folder_id)),
    ];
    // Aquí está el cambio - pasar los parámetros en el orden correcto
    const allNeededFolderIds = await getAllParentFolderIds(
      initialFolderIds,
      new Set(), // Pasar el Set vacío como segundo parámetro
      user_id
    );

    // 4. Obtener los detalles completos de todas las carpetas necesarias
    const { data: folders, error: foldersError } = await supabase
      .from("folder")
      .select(
        "id, created_at, user_id, name, type, pinned, parent_folder_id, color"
      )
      .eq("user_id", user_id)
      .in("id", allNeededFolderIds);

    if (foldersError) throw foldersError;

    // 5. Crear mapa de carpetas para acceso rápido
    const folderMap = folders.reduce((acc, folder) => {
      acc[folder.id] = folder;
      return acc;
    }, {});

    // 6. Construir la estructura jerárquica comenzando desde las carpetas raíz
    const rootFolders = folders
      .filter((f) => !f.parent_folder_id)
      .map((f) => buildFolderHierarchy(f.id, folderMap, folders))
      .filter(Boolean);

    // 7. Crear mapa de relaciones prompt-folder
    const promptFolderMap = promptFolders.reduce((acc, pf) => {
      if (!acc[pf.prompt_id]) {
        acc[pf.prompt_id] = [];
      }
      acc[pf.prompt_id].push(pf.folder_id);
      return acc;
    }, {});

    // 8. Función recursiva para asignar prompts a las carpetas

    // 9. Asignar prompts a toda la estructura de carpetas
    const finalFolderStructure = rootFolders.map((folder) =>
      assignPromptsToFolders(folder, prompts, promptFolderMap)
    );

    return {
      prompts,
      folders: finalFolderStructure,
      promptFolders,
    };
  } catch (error) {
    console.error(
      "Error al obtener la estructura de prompts y carpetas:",
      error
    );
    return null;
  }
};

// Get a single prompt by id
const get_prompt_by_type = async (user_id, type = null) => {
  let query = supabase
    .from("prompt")
    .select("*")
    .eq("user_id", user_id)
    .eq("type", type);

  const { data, error } = await query;

  if (error) {
    console.error("Error al obtener prompts:", error);
    return null;
  }
  return data;
};

// Update a prompt
const update_prompt = async (prompt_id, updates) => {
  const validFields = {
    favorite: true,
    updated_at: true,
    content: true,
    pinned: true,
  };

  // Filter out invalid fields
  const validUpdates = Object.keys(updates).reduce((acc, key) => {
    if (validFields[key]) acc[key] = updates[key];
    return acc;
  }, {});

  const { data, error } = await supabase
    .from("prompt")
    .update(validUpdates)
    .eq("id", prompt_id);

  if (error) {
    console.error("Error al actualizar prompt:", error);
    return false;
  }
  return true;
};

// Delete a prompt
const delete_prompt = async (prompt_id) => {
  const { error } = await supabase.from("prompt").delete().eq("id", prompt_id);

  if (error) {
    console.error("Error al eliminar prompt:", error);
    return false;
  }
  return true;
};

module.exports = {
  save_prompt,
  get_prompts,
  get_prompt_by_type,
  update_prompt,
  delete_prompt,
};
