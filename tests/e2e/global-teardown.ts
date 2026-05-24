import { createClient } from "@supabase/supabase-js";

async function globalTeardown() {
  console.log("Running Playwright Global Teardown...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn("Skipping teardown: Missing Supabase credentials.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Borrar pacientes de prueba
  // En auditoría se mencionó que se llaman "Paciente E2E" + Date.now()
  const { data: patients, error } = await supabase
    .from("patients")
    .select("id")
    .ilike("first_name", "%E2E%");

  if (error) {
    console.error("Error fetching E2E patients for teardown:", error.message);
    return;
  }

  if (patients && patients.length > 0) {
    const ids = patients.map((p) => p.id);
    // Elimina en cascada (clinical_records, appointments, etc)
    const { error: deleteError } = await supabase.from("patients").delete().in("id", ids);
    
    if (deleteError) {
      console.error("Error deleting E2E patients:", deleteError.message);
    } else {
      console.log(`Successfully deleted ${ids.length} E2E patients.`);
    }
  } else {
    console.log("No E2E patients found to delete.");
  }
}

export default globalTeardown;
