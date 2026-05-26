"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Solicita el envío de un correo de recuperación de contraseña.
 */
export async function requestPasswordReset(email: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    
    // Obtenemos la URL del sitio (ej. en producción o localhost)
    // El callback route se encargará de intercambiar el code y luego redirigir a /recuperar/actualizar
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirectTo = `${siteUrl}/api/auth/callback?next=/recuperar/actualizar`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      console.error("[requestPasswordReset] Error:", error.message);
      // Por seguridad, evitamos confirmar si el correo existe o no en caso de error genérico,
      // pero si es límite de envíos, lo mostramos.
      if (error.status === 429) {
        return { success: false, error: "Has solicitado demasiados correos. Espera unos minutos antes de intentar de nuevo." };
      }
      return { success: false, error: "Ocurrió un error al intentar enviar el correo. Por favor, intenta de nuevo." };
    }

    return { success: true };
  } catch (err) {
    console.error("[requestPasswordReset] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor." };
  }
}

/**
 * Actualiza la contraseña del usuario (requiere que el usuario esté autenticado,
 * lo cual ocurre automáticamente cuando hace clic en el enlace del correo).
 */
export async function updateUserPassword(password: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    
    // Verificamos que sí hay una sesión activa (por el magic link)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: "Tu sesión ha expirado o no tienes permisos para cambiar esta clave. Por favor, solicita un nuevo enlace." };
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error("[updateUserPassword] Error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[updateUserPassword] Unexpected error:", err);
    return { success: false, error: "Error interno del servidor." };
  }
}
