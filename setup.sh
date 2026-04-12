#!/usr/bin/env bash
set -e

# ===== Farm Games Wiki Editor Setup =====

REPO_URL="git@github.com:Farm-Games/farmgames.git"
REPO_NAME="farmgames"
SSH_KEY_NAME="farmgames"
NODE_MIN_VERSION=18

# ===== Colors =====

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}!${NC} $1"; }
fail()    { echo -e "${RED}✗${NC} $1"; }

ask() {
  local prompt="$1"
  local default="$2"
  local result
  echo -en "${BOLD}${prompt}${NC} " >&2
  read -r result
  echo "${result:-$default}"
}

ask_yn() {
  local prompt="$1"
  local default="${2:-y}"
  local result
  echo -en "${BOLD}${prompt} [${default}]${NC} "
  read -r result
  result="${result:-$default}"
  [[ "$result" =~ ^[Yy] ]]
}

# ===== Detect OS =====

detect_os() {
  case "$(uname -s)" in
    Linux*)  echo "linux" ;;
    Darwin*) echo "mac" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)       echo "unknown" ;;
  esac
}

OS=$(detect_os)

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}  Farm Games Wiki Editor Setup${NC}"
echo -e "${BOLD}========================================${NC}"
echo ""

if [ "$OS" = "unknown" ]; then
  fail "Could not detect your operating system."
  echo "  This script supports Linux (Debian/Ubuntu), macOS, and Windows (Git Bash)."
  exit 1
fi

success "Detected OS: $OS"

# ===== Determine default install directory =====

case "$OS" in
  linux)   DEFAULT_DIR="$HOME/Documents" ;;
  mac)     DEFAULT_DIR="$HOME/Documents" ;;
  windows) DEFAULT_DIR="$USERPROFILE/Documents" ;;
esac

INSTALL_DIR="$DEFAULT_DIR/$REPO_NAME"

# ===== Check for existing installation =====

if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/package.json" ]; then
  echo ""
  success "Farm Games Wiki Editor is already installed at: $INSTALL_DIR"
  echo ""

  if ask_yn "Update dependencies (npm install)?"; then
    info "Running npm install..."
    cd "$INSTALL_DIR"
    npm install
    success "Dependencies updated."
  fi

  if ask_yn "Create a desktop shortcut to run the editor?"; then
    create_shortcut
  fi

  if ask_yn "Run the editor now?"; then
    cd "$INSTALL_DIR"
    npm run editor
  fi

  exit 0
fi

# ===== Install system dependencies =====

echo ""
echo -e "${BOLD}Step 1: Install required software${NC}"
echo ""

install_git() {
  if command -v git &>/dev/null; then
    success "Git is already installed: $(git --version)"
    return
  fi
  info "Installing Git..."
  case "$OS" in
    linux)
      sudo apt-get update -qq
      sudo apt-get install -y -qq git
      ;;
    mac)
      if command -v brew &>/dev/null; then
        brew install git
      else
        fail "Git is not installed and Homebrew is not available."
        echo "  Please install Git from https://git-scm.com/download/mac"
        echo "  Or install Homebrew first: https://brew.sh"
        exit 1
      fi
      ;;
    windows)
      fail "Git is not installed."
      echo "  Please install Git from https://git-scm.com/download/win"
      echo "  Then re-run this script from Git Bash."
      exit 1
      ;;
  esac
  success "Git installed: $(git --version)"
}

install_node() {
  if command -v node &>/dev/null; then
    local version
    version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$version" -ge "$NODE_MIN_VERSION" ]; then
      success "Node.js is already installed: $(node -v)"
      return
    else
      warn "Node.js $(node -v) is installed but version $NODE_MIN_VERSION+ is required."
    fi
  fi
  info "Installing Node.js..."
  case "$OS" in
    linux)
      if ! command -v curl &>/dev/null; then
        sudo apt-get install -y -qq curl
      fi
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
      sudo apt-get install -y -qq nodejs
      ;;
    mac)
      if command -v brew &>/dev/null; then
        brew install node
      else
        fail "Homebrew is not available. Please install Node.js from https://nodejs.org"
        exit 1
      fi
      ;;
    windows)
      fail "Node.js is not installed."
      echo "  Please install Node.js LTS from https://nodejs.org"
      echo "  Then re-run this script."
      exit 1
      ;;
  esac
  success "Node.js installed: $(node -v)"
}

install_git
install_node

if ! command -v npm &>/dev/null; then
  fail "npm is not available. Please reinstall Node.js from https://nodejs.org"
  exit 1
fi
success "npm is available: $(npm -v)"

# ===== SSH Key Setup =====

echo ""
echo -e "${BOLD}Step 2: Set up SSH key for GitHub${NC}"
echo ""

SSH_KEY_PATH="$HOME/.ssh/$SSH_KEY_NAME"

setup_ssh_key() {
  if [ -f "$SSH_KEY_PATH" ]; then
    success "SSH key already exists at: $SSH_KEY_PATH"
    return
  fi

  info "Creating a new SSH key for the Farm Games repo..."
  mkdir -p "$HOME/.ssh"
  ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -q
  success "SSH key created at: $SSH_KEY_PATH"
}

setup_ssh_key

echo ""
echo -e "${BOLD}Your public key (copy this):${NC}"
echo ""
echo -e "${YELLOW}$(cat "${SSH_KEY_PATH}.pub")${NC}"
echo ""
echo "  1. Go to: https://github.com/settings/keys"
echo "  2. Click 'New SSH key'"
echo "  3. Paste the key above"
echo "  5. Click 'Add SSH key'"
echo ""

ask "Press Enter once you've added the key to GitHub..."

# ===== Test SSH connection =====

echo ""
info "Testing SSH connection to GitHub..."

if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 | grep -qi "success\|authenticated"; then
  success "SSH connection works!"
else
  fail "SSH connection failed."
  echo ""
  echo "  Troubleshooting:"
  echo "  - Make sure you copied the entire public key (including 'ssh-ed25519' prefix)"
  echo "  - Try running: ssh -i ~/.ssh/$SSH_KEY_NAME -T git@github.com"
  echo ""
  if ! ask_yn "Try again? (you can re-add the key and retry)"; then
    exit 1
  fi
  if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 | grep -qi "success\|authenticated"; then
    success "SSH connection works!"
  else
    fail "Still failing. Please ask for help."
    exit 1
  fi
fi

# ===== Clone repository =====

echo ""
echo -e "${BOLD}Step 3: Clone the repository${NC}"
echo ""

info "Default install location: $INSTALL_DIR"
CUSTOM_DIR=$(ask "Install location (press Enter for default):" "")

if [ -n "$CUSTOM_DIR" ]; then
  INSTALL_DIR="$CUSTOM_DIR/$REPO_NAME"
fi

PARENT_DIR=$(dirname "$INSTALL_DIR")

if [ ! -d "$PARENT_DIR" ]; then
  info "Creating directory: $PARENT_DIR"
  mkdir -p "$PARENT_DIR"
fi

info "Cloning into: $INSTALL_DIR"
git clone -c core.sshCommand="ssh -i $SSH_KEY_PATH" "$REPO_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"
git config core.sshCommand "ssh -i $SSH_KEY_PATH"
success "Repository cloned!"

# ===== Install npm dependencies =====

echo ""
echo -e "${BOLD}Step 4: Install dependencies${NC}"
echo ""

info "Running npm install..."
npm install
success "Dependencies installed!"

# ===== Create shortcut =====

echo ""
echo -e "${BOLD}Step 5: Create a shortcut${NC}"
echo ""

create_shortcut() {
  case "$OS" in
    linux)
      local SHORTCUT_PATH="$HOME/Desktop/FarmGamesEditor.sh"
      cat > "$SHORTCUT_PATH" << SCRIPT
#!/usr/bin/env bash
cd "$INSTALL_DIR" && npm run editor
SCRIPT
      chmod +x "$SHORTCUT_PATH"
      success "Shortcut created at: $SHORTCUT_PATH"
      ;;
    mac)
      local SHORTCUT_PATH="$HOME/Desktop/FarmGamesEditor.command"
      cat > "$SHORTCUT_PATH" << SCRIPT
#!/usr/bin/env bash
cd "$INSTALL_DIR" && npm run editor
SCRIPT
      chmod +x "$SHORTCUT_PATH"
      success "Shortcut created at: $SHORTCUT_PATH"
      echo "  Double-click it on your Desktop to launch the editor."
      ;;
    windows)
      local SHORTCUT_PATH="$HOME/Desktop/FarmGamesEditor.bat"
      cat > "$SHORTCUT_PATH" << SCRIPT
@echo off
cd /d "$INSTALL_DIR"
npm run editor
pause
SCRIPT
      success "Shortcut created at: $SHORTCUT_PATH"
      echo "  Double-click it on your Desktop to launch the editor."
      ;;
  esac
}

if ask_yn "Create a desktop shortcut to run the editor?"; then
  create_shortcut
fi

# ===== Run editor =====

echo ""
echo -e "${BOLD}Setup complete!${NC}"
echo ""
success "Farm Games Wiki Editor is installed at: $INSTALL_DIR"
echo ""

if ask_yn "Run the editor now?"; then
  cd "$INSTALL_DIR"
  npm run editor
else
  echo ""
  echo "  To run the editor later:"
  echo "    cd $INSTALL_DIR"
  echo "    npm run editor"
  echo ""
fi
