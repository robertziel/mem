# mem

`mem` is a small command-line tool for keeping quick notes as **plain Markdown files** on your disk.  
It installs a `mem` command that runs `mem.py` inside an isolated conda environment (no sudo).

Typical workflow:
- create a notes folder
- add notes fast from the terminal
- list / search notes
- open or edit notes in your editor

> For the exact commands and flags supported by your `mem.py`, run: `mem --help`

---

## Quick start

### 1) Install

Run the installer **from the directory that contains `mem.py`**:

```bash
chmod +x install.sh
./install.sh
````

Reload your shell (or open a new terminal):

```bash
source ~/.bashrc   # or ~/.zshrc
```

Verify:

```bash
which mem
mem --help
```

### 2) Choose a notes directory

Pick where your Markdown notes should live. Example:

```bash
export MEM_HOME="$HOME/mem-notes"
mkdir -p "$MEM_HOME"
```

(Optional) Persist it by adding the `export MEM_HOME=...` line to `~/.bashrc` or `~/.zshrc`.

### 3) Use it

Run `mem --help` to see your available commands, then try a basic flow like:

```bash
mem init
mem add "First note"
mem list
mem search "first"
```

---

## Usage

### Where notes are stored

Notes are stored under a directory called `MEM_HOME` (recommended to set explicitly):

```bash
export MEM_HOME="$HOME/mem-notes"
```

### Editor

`mem` will open files in your editor. Set your preferred editor via `EDITOR`:

```bash
export EDITOR=nvim   # or vim, micro, code, etc.
```

### Common operations (examples)

Exact commands depend on your `mem.py`, but a typical usage pattern looks like:

```bash
mem init
mem add "Meeting notes" -t "work,project-x" -b "Discussed next steps..."
mem list -n 50
mem search "project-x" --preview
mem edit "meeting"
mem rm "meeting"
mem open
mem run
```

Again, your source of truth is:

```bash
mem --help
```

---

## Installation details

### What `install.sh` does

* Detects OS:

  * **Linux** → installs wrapper to `~/.local/bin/mem`
  * **macOS** → installs wrapper to `~/bin/mem`
* Checks `conda` exists
* Creates conda environment `mem-env` with **Python 3.12** (if missing)
* Writes a small wrapper script (`mem`) that:

  * activates `mem-env`
  * runs `python /path/to/mem.py "$@"`
* Prints PATH instructions if your bin directory isn’t already in `PATH`

### What `uninstall.sh` does

* Removes the wrapper script (`mem`) from your user bin directory
* Removes the conda env `mem-env`

---

## Files

```text
.
├── mem.py
├── install.sh
└── uninstall.sh
```

---

## Troubleshooting (detailed)

### `mem: command not found`

1. Confirm where the wrapper was installed:

* Linux: `~/.local/bin/mem`
* macOS: `~/bin/mem`

2. Ensure that directory is on your PATH:

Linux (bash):

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

macOS (zsh):

```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

3. Verify:

```bash
which mem
mem --help
```

---

### Conda not found

The installer requires `conda` to be available in your shell:

```bash
conda --version
```

If not found, install Miniconda/Anaconda and reopen your terminal.

---

### Conda environment issues (`mem-env`)

Check it exists:

```bash
conda env list | grep mem-env
```

Recreate it if needed:

```bash
conda create -y -n mem-env python=3.12
```

---

### `MEM_HOME` not set / notes directory not found

Set it and create the directory:

```bash
export MEM_HOME="$HOME/mem-notes"
mkdir -p "$MEM_HOME"
mem init
```

Persist the export line in your shell config (`~/.bashrc` or `~/.zshrc`) if you want.

---

### Editor doesn’t open / wrong editor

Set `EDITOR`:

```bash
export EDITOR=vim
```

Persist it in your shell config if desired.

---

### `mem open` does nothing (Linux)

If your tool uses `xdg-open`, install:

```bash
sudo apt-get update
sudo apt-get install -y xdg-utils
```

---

### `mem run` UI looks broken

If interactive mode uses a terminal UI (curses), try:

* enlarging the terminal window
* using a different terminal emulator
* ensuring a UTF-8 locale (e.g. `LANG=en_US.UTF-8`)

---

## Uninstall

```bash
chmod +x uninstall.sh
./uninstall.sh
```

This removes the `mem` wrapper and deletes the `mem-env` conda environment.
