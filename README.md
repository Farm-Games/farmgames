# Farm Games Wiki

The official wiki for all things Farm Games, hosted at [farmgames.uk](https://farmgames.uk).

## Quick Setup (Recommended)

The setup script handles everything automatically -- installing Git, Node.js, SSH keys, cloning, and creating a desktop shortcut. Works on Linux, macOS, and Windows.

### Linux / macOS

Open a terminal and run:

```
curl -fsSL https://raw.githubusercontent.com/Farm-Games/farmgames/master/setup.sh | bash
```

Or if you already have the repo, run `./setup.sh` from the project folder.

### Windows

1. Install [Node.js LTS](https://nodejs.org/) 
2. Install [Git for Windows](https://git-scm.com/download/win)
3. Open **Git Bash**
4. Run:

```
curl -fsSL https://raw.githubusercontent.com/Farm-Games/farmgames/master/setup.sh | bash
```

The script will:
- Install Node.js if needed
- Create an SSH key and guide you through adding it to GitHub
- Clone the repo to your Documents folder (or a location you choose)
- Install dependencies
- Optionally create a desktop shortcut
- Optionally launch the editor

Running the script again will detect the existing installation and offer to update, create a shortcut, or launch the editor.

## Manual Setup

If you prefer to set things up yourself:

### Mac / Linux

1. Clone the repo:
   ```
   git clone git@github.com:Farm-Games/farmgames.git
   cd farmgames
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the editor:
   ```
   npm run editor
   ```

The editor opens automatically at `http://localhost:3456`.

### Windows (Manual)

1. Install [Node.js LTS](https://nodejs.org/) and [Git](https://git-scm.com/download/win)
2. Open **Git Bash** and set up your SSH key:

```
ssh-keygen -t ed25519 -f ~/.ssh/farmgames
cat ~/.ssh/farmgames.pub
```

3. Add the public key as a deploy key at [the repo settings](https://github.com/Farm-Games/farmgames/settings/keys) with write access enabled
4. Clone and run:

```
git clone -c core.sshCommand="ssh -i ~/.ssh/farmgames" git@github.com:Farm-Games/farmgames.git
cd farmgames
git config core.sshCommand "ssh -i ~/.ssh/farmgames"
npm install
npm run editor
```

## Using the Editor

- **New** -- create a new wiki page
- **Open** -- open an existing page (with search)
- **Save** -- save the current page (Ctrl+S)
- **Delete** -- delete the current page
- **W button** (in the formatting toolbar) -- insert a link to another wiki page
- **Image button** (in the formatting toolbar) -- upload and insert an image
- **Deploy** (Ctrl+D) -- publish all changes to the live website
- **Link All** (Ctrl+L) -- find and link text across all pages
- **Preview** -- launch a local preview of the full site
- **Settings** -- configure site title, page title template, and favicon
- **Update** -- pull latest changes from other editors

## Building the Site Locally

To generate the static HTML without the editor:

```
node generate_site.js
```

To preview the generated site with live reload:

```
npm run preview
```

Output goes to the `public/` folder.
