# mem - Markdown Note CLI and Web Application

## Project Overview

`mem` is a lightweight CLI tool for capturing and managing Markdown notes as plain files on disk. It's designed to work in an isolated conda environment and provides both a terminal-based interface and a web/mobile UI for browsing notes.

The tool uses a hierarchical search system to organize notes with directories, subdirectories, and filenames as the primary search components. The web and mobile interfaces provide a user-friendly way to navigate and explore the notes corpus.

## Repository Structure

```
/mnt/crucial2/projects/mem/
├── mem/                 # Core Python package (CLI, API, service layer)
│   ├── __init__.py
│   ├── api.py           # FastAPI web API
│   ├── config.py        # Configuration (MEM_HOME, EDITOR)
│   ├── gui.py           # Curses-based interactive UI
│   ├── main.py          # CLI entry point
│   ├── note_manager.py  # CLI command implementations
│   ├── seed_export.py   # Export seed assets for web/mobile apps
│   ├── service.py       # Service layer for search and note operations
│   └── utils.py         # Utilities (search scoring, path handling, slugification)
├── web/                 # Expo React Native web application
│   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── repository/
│   │   ├── search.ts    # Search logic for web UI
│   │   └── types.ts
│   ├── __tests__/       # Jest tests
│   ├── e2e/             # Playwright E2E tests
│   ├── maestro/         # Maestro UI tests
│   └── package.json     # Dependencies and scripts
├── data/                # Default notes directory (when MEM_HOME not set)
├── install.sh           # Installation script
├── uninstall.sh         # Uninstallation script
└── environment.yml      # Conda environment definition
```

## Key Features

- **CLI Interface**: Terminal-based note management with commands for add, list, search, edit, and removal
- **Web UI**: Browser-based interface accessible via `mem server`
- **Mobile UI**: iOS and Android support via Expo
- **Hierarchical Search**: Notes organized by directory structure with scoring based on directory, subdirectory, and filename matches
- **Offline Access**: Mobile and web applications seed a local copy of notes for offline browsing

## Building and Running

### Using Docker (Recommended)
The project can be run entirely using Docker. This is the preferred method for consistent environments and avoiding dependency conflicts.

```bash
# Build the Docker images
docker-compose build

# Run the application (CLI commands)
docker-compose run mem

# Start the web server
docker-compose up -d
```

### Local Installation (Alternative)
If you prefer to install locally (not recommended), the standard installation process is:

```bash
chmod +x install.sh
./install.sh
source ~/.bashrc  # or ~/.zshrc
which mem
mem --help  # verify installation
```

### Setup
Set notes directory:
```bash
export MEM_HOME="$HOME/mem-notes"
mkdir -p "$MEM_HOME"
```

Set editor (default: nano/vi):
```bash
export EDITOR=nvim
```

### CLI Usage
```bash
mem init                 # Initialize memory directory
mem add "Title" -t "tag1,tag2" -b "Body text..."  # Add new note
mem list -n 30           # List recent notes
mem search "query" --preview  # Search with preview
mem edit "keywords"      # Edit note
mem rm "keywords"        # Remove note
mem open                 # Open notes directory
mem run                  # Interactive live search UI
mem server               # Start web UI server
```

### Web Application Build
```bash
cd web
npm install
npm run build            # Build web UI
```

### Testing
```bash
npm test                 # Jest unit + component + smoke tests
npm run test:e2e         # Playwright E2E tests
npm run test:maestro:ios # Maestro iOS tests
npm run test:maestro:android  # Maestro Android tests
```

## Architecture

### CLI Components
- **main.py**: CLI argument parser and command routing
- **note_manager.py**: Implements CLI commands (add, list, search, edit, delete)
- **utils.py**: File search and classification logic, including hierarchical scoring
- **config.py**: Environment configuration management
- **gui.py**: Curses-based interactive terminal UI

### Web/Mobile Components
- **web/app/search.ts**: Core search logic with categories, directory browsing, and flat search
- **web/app/components/**: React components for UI elements
- **seed_export.py**: Exports notes corpus for web/mobile applications
- **NoteRepository interface**: Defines data access layer for both web (IndexedDB) and native (SQLite) implementations

## Search Algorithm

The search algorithm uses a hierarchical path scoring system with these priority levels:

1. **Top-level directory** (×1000 weight)
2. **Subdirectory** (×100 weight)  
3. **Filename** (×10 weight)
4. **Content** (×1 weight - not used in web/mobile UI)

Results are sorted by score descending, then by modification time. The web/mobile interface intentionally excludes content matching to avoid diluting search results with common words.

## Development Conventions

- Python code uses Python 3.11
- Node.js version specified in `.nvmrc` (version 22+)
- Conda environment with dependencies defined in `environment.yml`
- All CLI commands use argparse for consistent argument parsing
- Search functionality is centralized in `utils.py` with a sophisticated scoring system
- Web application uses React with TypeScript
- Code is organized by functionality with clear separation between CLI and UI components