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

    // 2. Filtrar y ordenar los prompts favoritos por updated_at (del más reciente al más antiguo)
    const favoritePrompts = prompts
      .filter((prompt) => prompt.favorite === true)
      .sort((a, b) => {
        // Si updated_at no existe, usar created_at
        const dateA = a.updated_at || a.created_at;
        const dateB = b.updated_at || b.created_at;
        return new Date(dateB) - new Date(dateA); // Orden descendente
      });

    // 3. Obtener las relaciones prompt-folder
    const { data: promptFolders, error: promptFoldersError } = await supabase
      .from("promptFolder")
      .select("created_at, prompt_id, folder_id, user_id")
      .eq("user_id", user_id);

    if (promptFoldersError) throw promptFoldersError;

    // 4. Identificar prompts sin carpetas
    const promptsWithFolders = new Set(promptFolders.map((pf) => pf.prompt_id));
    const promptsWithoutFolders = prompts
      .filter((p) => !promptsWithFolders.has(p.id))
      .sort((a, b) => {
        // Primero ordenar por pinned (true primero)
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        // Luego ordenar por updated_at o created_at
        const dateA = a.updated_at || a.created_at;
        const dateB = b.updated_at || b.created_at;
        return new Date(dateB) - new Date(dateA); // Orden descendente
      });

    // 5. Obtener todas las carpetas necesarias, incluyendo la jerarquía completa
    const initialFolderIds = [
      ...new Set(promptFolders.map((pf) => pf.folder_id)),
    ];

    const allNeededFolderIds = await getAllParentFolderIds(
      initialFolderIds,
      new Set(),
      user_id
    );

    // 6. Obtener los detalles completos de todas las carpetas necesarias
    let folders = [];
    let folderMap = {};
    let rootFolders = [];
    let finalFolderStructure = [];

    if (allNeededFolderIds && allNeededFolderIds.length > 0) {
      const { data: foldersData, error: foldersError } = await supabase
        .from("folder")
        .select(
          "id, created_at, user_id, name, type, pinned, parent_folder_id, color"
        )
        .eq("user_id", user_id)
        .in("id", allNeededFolderIds);

      if (foldersError) throw foldersError;

      if (foldersData && foldersData.length > 0) {
        folders = foldersData;

        // 7. Crear mapa de carpetas para acceso rápido
        folderMap = folders.reduce((acc, folder) => {
          acc[folder.id] = folder;
          return acc;
        }, {});

        // 8. Construir la estructura jerárquica comenzando desde las carpetas raíz
        rootFolders = folders
          .filter((f) => !f.parent_folder_id)
          .map((f) => buildFolderHierarchy(f.id, folderMap, folders))
          .filter(Boolean);

        // 9. Crear mapa de relaciones prompt-folder
        const promptFolderMap = promptFolders.reduce((acc, pf) => {
          if (!acc[pf.prompt_id]) {
            acc[pf.prompt_id] = [];
          }
          acc[pf.prompt_id].push(pf.folder_id);
          return acc;
        }, {});

        // 10. Asignar prompts a toda la estructura de carpetas y ordenarlos por pinned y updated_at
        finalFolderStructure = rootFolders.map((folder) => {
          const folderWithPrompts = assignPromptsToFolders(
            folder,
            prompts,
            promptFolderMap
          );

          // Ordenar los prompts en cada carpeta
          folderWithPrompts.prompts.sort((a, b) => {
            // Primero ordenar por pinned (true primero)
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            // Luego ordenar por updated_at o created_at
            const dateA = a.updated_at || a.created_at;
            const dateB = b.updated_at || b.created_at;
            return new Date(dateB) - new Date(dateA); // Orden descendente
          });

          return folderWithPrompts;
        });
      }
    }

    return {
      prompts: promptsWithoutFolders,
      folders: finalFolderStructure,
      promptFolders,
      favorite_prompts: favoritePrompts,
    };
  } catch (error) {
    console.error(
      "Error al obtener la estructura de prompts y carpetas:",
      error
    );
    return null;
  }
};

// Get a single prompt by type
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
