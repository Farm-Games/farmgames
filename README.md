# Farm Games Wiki

The official wiki for all things Farm Games, hosted at [farmgames.uk](https://farmgames.uk).

## Running the Editor

The wiki comes with a built-in WYSIWYG editor for creating and editing pages. You'll need **Node.js** (v18 or later) and **Git** installed.

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

### Windows Setup

#### 1. Install Node.js

Download and install from [nodejs.org](https://nodejs.org/) (pick the LTS version). The installer adds `node` and `npm` to your PATH automatically.

#### 2. Install Git

Download and install from [git-scm.com](https://git-scm.com/download/win). During installation:

- On the **"Adjusting your PATH"** step, select **"Git from the command line and also from 3rd-party software"**
- On the **"Choosing SSH executable"** step, select **"Use bundled OpenSSH"**
- Accept defaults for everything else

#### 3. Set up your SSH key

Open **Git Bash** (installed with Git) and run:

```
ssh-keygen -t ed25519 -f ~/.ssh/farmgames
```

Press Enter twice to skip the passphrase. Then print your public key:

```
cat ~/.ssh/farmgames.pub
```

Copy the output and add it as a deploy key on the GitHub repo (Settings > Deploy keys > Add deploy key). Check **"Allow write access"**.

Create an SSH config file:

```
notepad ~/.ssh/config
```

Paste this, save, and close:

```
Host github-farmgames
  HostName github.com
  User git
  IdentityFile ~/.ssh/farmgames
```

#### 4. Clone and run

In **Git Bash** or **Command Prompt**:

```
git clone git@github-farmgames:Farm-Games/farmgames.git
cd farmgames
npm install
npm run editor
```

## Using the Editor

- **New** -- create a new wiki page
- **Open** -- open an existing page (with search)
- **Save** -- save the current page (Ctrl+S works too)
- **Delete** -- delete the current page
- **W button** (in the formatting toolbar) -- insert a link to another wiki page
- **Image button** (in the formatting toolbar) -- upload and insert an image
- **Deploy** -- publish all changes to the live website

## Building the Site Locally

To generate the static HTML without the editor:

```
node generate_site.js
```

Output goes to the `public/` folder.
