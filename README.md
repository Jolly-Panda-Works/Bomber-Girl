# Bomber Girl ❄️💣

A cozy, winter-themed "risk run" browser game inspired by classic Bomberman: pick a tile, plant a bomb, clear the boxes, and cash out before a monster catches you. Pure HTML/CSS/JS — no build step, no dependencies.

![Bomber Girl](assets/logo.png)

## Play it

- **Live demo:** https://jolly-panda-works.github.io/Bomber-Girl/
- **Locally:** clone the repo and serve the folder — see [Running locally](#running-locally).

## Running locally

The game loads `assets.json` and its sprite images at runtime via `fetch`, which most browsers block on a plain `file://` URL. Serve the folder with any static file server instead:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# VS Code
# Right-click index.html -> "Open with Live Server"
```

Then open the printed URL (e.g. `http://localhost:8080`) in your browser.

## Deploying to GitHub Pages

This repo includes a ready-to-use GitHub Actions workflow at `.github/workflows/pages.yml` that publishes the site automatically.

1. Push this repo to GitHub.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab) — the site will be published at `https://<your-username>.github.io/<repo-name>/`.

## Project structure

```
index.html      markup + splash screen
style.css       all styling
assets.js       loads assets.json and builds the runtime asset map
                (falls back to a built-in copy if fetch is blocked)
game.js         game logic: board generation, movement, bombs, monster AI, scoring
bootstrap.js    wires the splash screen to asset loading and game start
assets.json     single source of truth for every sprite/animation/emoji fallback
assets/         sprite sheets, environment art, and the splash logo
```

## How the asset system works

Every visual in the game (player, monster, bombs, boxes, rewards, decorations) is described declaratively in `assets.json`, not hard-coded in the game logic:

- An animated sprite: `{ "type": "frames", "frames": [...], "fps": 6, "loop": true, "emoji": "🧑‍🚀" }`
- A static image: `{ "type": "image", "src": "assets/...png", "emoji": "🌲" }`

`emoji` is always present as a fallback. If an image file ever fails to load, the game automatically swaps to the emoji instead of breaking (a warning is logged to the console so you can spot missing/renamed files quickly).

To add or change art, edit `assets.json` — no changes to `game.js` are needed.

## License

Code is released under the [MIT License](LICENSE) — see the file for details. The artwork in `assets/` was created for this project; feel free to use it for your own fork of this game, but please don't redistribute it separately from the project.
