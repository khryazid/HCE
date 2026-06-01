#!/bin/bash

# ============================================================
# Glyphix — Setup del Agente Claude Code
# Copia los archivos de configuración a tu proyecto
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-.}"

echo ""
echo "🏥 Glyphix — Instalando agente Claude Code"
echo "📁 Destino: $TARGET_DIR"
echo ""

# Verificar que el destino existe
if [ ! -d "$TARGET_DIR" ]; then
  echo "❌ El directorio '$TARGET_DIR' no existe."
  echo "   Uso: ./setup.sh /ruta/a/tu/proyecto"
  exit 1
fi

# Advertencia si ya existe CLAUDE.md
if [ -f "$TARGET_DIR/CLAUDE.md" ]; then
  echo "⚠️  Ya existe un CLAUDE.md en el destino."
  read -p "   ¿Sobrescribir? (s/N): " confirm
  if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
    echo "   Cancelado."
    exit 0
  fi
fi

# Copiar CLAUDE.md
echo "📄 Copiando CLAUDE.md..."
cp "$SCRIPT_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"

# Crear estructura .claude/
echo "📁 Creando .claude/..."
mkdir -p "$TARGET_DIR/.claude/commands"

# Copiar settings.json
echo "⚙️  Copiando .claude/settings.json (modelo: claude-opus-4-8)..."
cp "$SCRIPT_DIR/.claude/settings.json" "$TARGET_DIR/.claude/settings.json"

# Copiar comandos personalizados
echo "⚡ Copiando comandos personalizados..."
for cmd in "$SCRIPT_DIR/.claude/commands/"*.md; do
  filename=$(basename "$cmd")
  cp "$cmd" "$TARGET_DIR/.claude/commands/$filename"
  echo "   ✅ /$(basename "$filename" .md)"
done

echo ""
echo "✅ Agente instalado correctamente."
echo ""
echo "════════════════════════════════════════"
echo "  Comandos disponibles en Claude Code:"
echo "════════════════════════════════════════"
echo ""
echo "  /crear-migracion          → Genera migraciones de BD"
echo "  /crear-auth               → Crea middleware de auth y guards"
echo "  /crear-ruta [ruta]        → Genera ruta protegida"
echo "  /crear-invitacion         → Implementa flujo de invitaciones"
echo "  /crear-guardia [rol]      → Guard para un rol específico"
echo "  /crear-rol-dashboard [r]  → Dashboard de un rol"
echo "  /diagnosticar-permisos    → Detecta problemas de permisos"
echo ""
echo "  💡 Para iniciar: claude"
echo "     Luego escribe: /crear-migracion"
echo ""
