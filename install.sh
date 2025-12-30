#!/bin/bash

# install.sh for mem tool
# Run this script from the directory containing mem.py to install the 'mem' command.
# This script creates a conda environment if it doesn't exist, and sets up a wrapper script in a user-local bin directory (no sudo required).

SCRIPT_DIR=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd)
MEM_PY="$SCRIPT_DIR/mem.py"
ENV_NAME="mem-env"

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
if [[ "$OS" == "linux" ]]; then
    BIN_DIR="$HOME/.local/bin"
elif [[ "$OS" == "darwin" ]]; then
    BIN_DIR="$HOME/bin"
else
    echo "Unsupported OS: $OS"
    exit 1
fi

# Check if conda is installed
if ! command -v conda &> /dev/null; then
    echo "Conda not found. Please install Miniconda or Anaconda first."
    exit 1
fi

# Create conda environment if it doesn't exist
if ! conda env list | grep -q "^$ENV_NAME"; then
    echo "Creating conda environment $ENV_NAME with Python 3.12"
    conda create -y -n $ENV_NAME python=3.12
fi

# Create bin directory if it doesn't exist
mkdir -p "$BIN_DIR" || { echo "fail"; exit 1; }

# Create the wrapper script
WRAPPER="$BIN_DIR/mem"
cat > "$WRAPPER" << EOF
#!/bin/bash

CONDA_BASE=\$(conda info --base)
source \$CONDA_BASE/etc/profile.d/conda.sh
conda activate $ENV_NAME
python "$MEM_PY" "\$@"
EOF

if [ $? -ne 0 ]; then
    echo "fail"
    exit 1
fi

# Make the wrapper executable
chmod +x "$WRAPPER"

if [ $? -ne 0 ]; then
    echo "fail"
    exit 1
fi

# Detect shell for PATH instructions
SHELL_NAME=$(basename "$SHELL")
if [[ "$SHELL_NAME" == "zsh" ]]; then
    CONFIG_FILE="~/.zshrc"
elif [[ "$SHELL_NAME" == "bash" ]]; then
    CONFIG_FILE="~/.bashrc"
else
    CONFIG_FILE="your shell configuration file"
fi

echo "Installation complete. The 'mem' command has been added to $BIN_DIR."

# Check if BIN_DIR is already in PATH
if ! echo "$PATH" | grep -q -E "(^|:)${BIN_DIR//\\/\\\\}(:|$)"; then
    echo "Ensure $BIN_DIR is in your PATH by adding the following to $CONFIG_FILE:"
    echo "export PATH=\"$BIN_DIR:\$PATH\""
    echo "Then, reload your shell with 'source $CONFIG_FILE'."
else
    echo "$BIN_DIR is already in your PATH. If the 'mem' command is not immediately available, reload your shell with 'source $CONFIG_FILE'."
fi