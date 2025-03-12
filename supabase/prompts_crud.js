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

const get_prompts = async (user_id) => {
  const { data, error } = await supabase
    .from("prompt")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error("Error al obtener prompts:", error);
    return null;
  }
  return data;
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
