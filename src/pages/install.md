# Install the Farm Games Wiki Editor

Welcome! This guide will help you set up the editor so you can create and edit wiki pages.

## Quick Setup (Recommended)

We have a setup script that handles everything automatically -- installing Git, Node.js, SSH keys, cloning the project, and creating a desktop shortcut.

### Windows

1. Download and install [Node.js](https://nodejs.org/) (pick the big green LTS button)
2. Download and install [Git](https://git-scm.com/download/win) (use all the default options)
3. Open **Git Bash** (search for it in your Start menu after installing Git)
4. Paste this command and press Enter:

```
curl -fsSL https://raw.githubusercontent.com/Farm-Games/farmgames/master/setup.sh | bash
```

5. Follow the prompts -- the script will walk you through everything step by step

### Mac

1. Open **Terminal** (search for it in Spotlight)
2. Paste this command and press Enter:

```
curl -fsSL https://raw.githubusercontent.com/Farm-Games/farmgames/master/setup.sh | bash
```

3. Follow the prompts

### Linux

Open a terminal and run:

```
curl -fsSL https://raw.githubusercontent.com/Farm-Games/farmgames/master/setup.sh | bash
```

## What the script does

1. Installs Git and Node.js if you don't have them
2. Creates an SSH key so your computer can securely talk to GitHub
3. Shows you the key and tells you where to paste it on GitHub
4. Clones (downloads) the wiki project to your Documents folder
5. Installs the project dependencies
6. Offers to create a desktop shortcut you can double-click to launch the editor
7. Offers to launch the editor right away

## After installation

- **To open the editor**: double-click the desktop shortcut, or open a terminal, navigate to the project folder, and run `npm run editor`
- **The editor opens in your browser** at http://localhost:3456
- **To publish your changes**: click the Deploy button in the editor toolbar

## Running the script again

If you run the setup script again after it's already installed, it will:
- Detect that it's already set up
- Offer to update dependencies
- Offer to create the shortcut again
- Offer to launch the editor

## Need help?

If something goes wrong during setup, contact **Kev** for assistance.
