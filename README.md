# mem

`mem` is a lightweight CLI for capturing Markdown notes as plain files on disk, installed via `mem.py` in an isolated conda env (no sudo).

## Install

From dir with `mem.py`:

```bash
chmod +x install.sh
./install.sh
source ~/.bashrc  # or ~/.zshrc
which mem
mem --help  # verify
```

Creates `mem-env` conda env and wrapper in `~/.local/bin` (Linux) or `~/bin` (macOS). Add to PATH if needed.

## Setup

Set notes dir:

```bash
export MEM_HOME="$HOME/mem-notes"
mkdir -p "$MEM_HOME"
```

Add to `~/.bashrc` or `~/.zshrc` for persistence.

Set editor (default: nano/vi):

```bash
export EDITOR=nvim  # or vim, code, etc.
```

## Usage

Run `mem --help` for commands/flags.

Init:

```bash
mem init
```

Add note:

```bash
mem add "Title" -t "tag1,tag2" -b "Body text..."
```

List:

```bash
mem list -n 30
```

Search:

```bash
mem search "query" --preview
```

Edit/Remove:

```bash
mem edit "keywords"
mem rm "keywords"
```

Open dir:

```bash
mem open
```

Interactive UI:

```bash
mem run  # search/preview/edit
```

## Files

- `mem.py`: Main script
- `install.sh`: Installer
- `uninstall.sh`: Uninstaller

## Uninstall

```bash
chmod +x uninstall.sh
./uninstall.sh
```

Removes wrapper and `mem-env`.

## Troubleshooting

- `mem not found`: Add bin dir to PATH.
- Conda issues: Ensure `conda` installed; recreate env with `conda create -n mem-env python=3.12`.
- No notes dir: Set/export `MEM_HOME`.
- Wrong editor: Set `EDITOR`.
- UI broken: Enlarge terminal, check UTF-8 locale.
