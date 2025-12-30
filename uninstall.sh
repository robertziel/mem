#!/bin/bash
# uninstall.sh for mem tool
# Run this script from the directory containing the 'mem' package directory to uninstall the 'mem' command.
# Removes the 'mem' wrapper from bin and deletes the conda environment.
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
WRAPPER="$BIN_DIR/mem"
# Check if conda exists
if ! command -v conda &> /dev/null; then
echo "Conda not found. Nothing to remove."
exit 1
fi
# Remove wrapper script
if [[ -f "$WRAPPER" ]]; then
echo "Removing $WRAPPER"
rm -f "$WRAPPER" || { echo "Failed to remove wrapper"; exit 1; }
else
echo "Wrapper not found: $WRAPPER"
fi
# Remove conda environment
if conda env list | grep -q "^$ENV_NAME"; then
echo "Removing conda environment: $ENV_NAME"
conda remove -y -n "$ENV_NAME" --all || { echo "Failed to remove conda env"; exit 1; }
else
echo "Conda environment '$ENV_NAME' does not exist"
fi
echo "Uninstall complete."