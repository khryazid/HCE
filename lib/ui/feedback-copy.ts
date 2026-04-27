export function buildRetryableErrorMessage(action: string) {
  return `No se pudo ${action}. Revisa tu conexion e intenta nuevamente.`;
}

export function buildFileReadErrorMessage(resource: string) {
  return `No se pudo leer ${resource}. Vuelve a intentarlo con otro archivo.`;
}