const { createClient } = require("@supabase/supabase-js");

// TODO Cambiar este llamado para que funciona en produccion
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase };
