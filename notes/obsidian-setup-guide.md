# 🔮 Guía Obsidian — Setup Completo

## Estado actual ✅
- Obsidian instalado (v1.12.7)
- Vault apuntando a `~/.openclaw/workspace`
- Workspace organizado (scripts/, data/, assets/, archive/, notes/)
- Config de Obsidian lista (.obsidian/ con plugins core activados)
- `obsidian-cli` instalado via Homebrew
- Skill de Obsidian instalado en OpenClaw

## Pendiente (cuando abras Obsidian) ⏳
1. Abrir Obsidian → confiar en el vault cuando pregunte
2. Ir a Settings → Community Plugins → activar
3. Instalar los plugins recomendados (ver abajo)
4. Configurar `obsidian-cli`: se autoconfigura al abrir el vault

---

## Plugins recomendados para ti

### 🔴 Esenciales (instalar primero)

| Plugin | Para qué |
|--------|----------|
| **Calendar** | Navegar tus daily notes (memory/) con un calendario visual |
| **Dataview** | Queries tipo base de datos sobre tus notas. Ej: "todas las notas de GrowthSuite con tag #bug" |
| **Tasks** | Manejar to-dos con fechas, prioridades, recurrencia, filtros |
| **Templater** | Templates dinámicos para notas nuevas (meeting notes, ideas, research) |
| **Kanban** | Tableros tipo Trello dentro de Obsidian — perfecto para backlogs |

### 🟡 Muy útiles (instalar después)

| Plugin | Para qué |
|--------|----------|
| **QuickAdd** | Capturar ideas rápido con un shortcut, se crean en la carpeta correcta |
| **Excalidraw** | Diagramas a mano, mapas mentales, arquitectura |
| **Obsidian Git** | Backup automático de tu vault a GitHub |
| **Linter** | Auto-formatear notas al guardar |
| **Recent Files** | Sidebar con notas recientes |

### 🟢 Nice-to-have

| Plugin | Para qué |
|--------|----------|
| **Periodic Notes** | Notas semanales, mensuales (reviews) |
| **Advanced Tables** | Editar tablas markdown fácilmente |
| **Paste URL into selection** | Seleccionas texto, pegas URL, crea link automático |
| **Outliner** | Mejora el manejo de bullet lists (mover, fold, etc.) |
| **Hider** | Ocultar elementos de UI para un look más limpio |

---

## Workflows con OpenClaw

### 1. Research on demand
Tú: "Investiga X y déjame una nota"
→ Yo investigo, escribo en notes/, tú lees en Obsidian

### 2. Subagentes paralelos
Tú: "Quiero pensar en estos 3 temas"
→ Yo lanzo 3 agentes, cada uno investiga y escribe su nota

### 3. Tú escribes, yo consulto
Tú creas notas con ideas → yo las leo y uso como contexto

### 4. Kanban + backlogs
Crear boards por proyecto/módulo → yo actualizo tareas automáticamente

---

## obsidian-cli — Comandos útiles

```bash
# Buscar notas
obsidian-cli search "query"
obsidian-cli search-content "query"

# Crear nota
obsidian-cli create "Folder/nota" --content "..." --open

# Mover (actualiza wikilinks automáticamente)
obsidian-cli move "viejo/path" "nuevo/path"

# Ver vault default
obsidian-cli print-default
```

---

## Estructura del vault

```
workspace/
├── Home.md              ← Página de inicio
├── notes/               ← Tus notas personales
├── memory/              ← Daily notes del agente
├── projects/            ← Proyectos (GrowthSuite, etc.)
├── scripts/             ← Scripts organizados
├── data/                ← Datos (JSON, Excel, states)
├── assets/              ← Screenshots, imágenes, PDFs
├── archive/             ← Archivos históricos
├── skills/              ← Skills de OpenClaw
├── docs/                ← Documentación
├── MEMORY.md            ← Memoria largo plazo del agente
├── SOUL.md              ← Personalidad del agente
├── USER.md              ← Info sobre ti
├── TOOLS.md             ← Herramientas y credenciales
└── HEARTBEAT.md         ← Checks periódicos
```
