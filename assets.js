(function(){
  'use strict';

  // Same-page fallback copy of assets.json -- used ONLY if the browser
  // blocks fetch() from loading the real assets.json file next to this
  // page (this happens in some browsers when index.html is opened directly
  // from disk via file:// instead of through a local server). When fetch
  // succeeds, the real assets.json file on disk is used instead and this
  // copy is ignored entirely.
  const ASSET_CONFIG_FALLBACK = {
  "_comment": "Centralized asset configuration for Bomber Girl. Every gameplay object resolves its look-and-feel from here. Each entry is either {type:'frames', frames:[...], fps, loop, emoji} for animated sprites, or {type:'image', src, emoji} for a static image, or {type:'emoji', emoji} when no art exists yet. 'emoji' is always present as the fallback if the referenced file(s) fail to load. Paths are relative to this file's parent folder (i.e. relative to game_assets/).",
  "tileSize": {
    "width": 32,
    "height": 32,
    "note": "source tile size from the asset sheet; scale in-engine as needed"
  },
  "tile": {
    "_note": "Base look of a normal walkable board tile (used for both the 'snow' and 'floor' tile kinds). If 'src' is set and the image loads, it replaces the default CSS ice-gradient tile background; leave 'src' null to keep the current default look.",
    "empty": {
      "type": "image",
      "src": null,
      "emoji": null
    }
  },
  "player": {
    "idle": {
      "type": "frames",
      "frames": [
        "assets/player/idle_0.png",
        "assets/player/idle_1.png"
      ],
      "fps": 2,
      "loop": true,
      "emoji": "🧑‍🚀"
    },
    "up": {
      "type": "frames",
      "frames": [
        "assets/player/up_0.png",
        "assets/player/up_1.png",
        "assets/player/up_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "🧑‍🚀"
    },
    "down": {
      "type": "frames",
      "frames": [
        "assets/player/down_0.png",
        "assets/player/down_1.png",
        "assets/player/down_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "🧑‍🚀"
    },
    "left": {
      "type": "frames",
      "frames": [
        "assets/player/left_0.png",
        "assets/player/left_1.png",
        "assets/player/left_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "🧑‍🚀"
    },
    "right": {
      "type": "frames",
      "frames": [
        "assets/player/left_0.png",
        "assets/player/left_1.png",
        "assets/player/left_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "🧑‍🚀",
      "mirror": true,
      "_note": "no move_right sheet was in the source asset sheet -- mirrored from left via CSS/engine transform: scaleX(-1)"
    },
    "die": {
      "type": "frames",
      "frames": [
        "assets/player/die_0.png",
        "assets/player/die_1.png",
        "assets/player/die_2.png"
      ],
      "fps": 5,
      "loop": false,
      "emoji": "💀"
    }
  },
  "monster": {
    "idle": {
      "type": "frames",
      "frames": [
        "assets/monster/idle_0.png",
        "assets/monster/idle_1.png"
      ],
      "fps": 2,
      "loop": true,
      "emoji": "👾"
    },
    "up": {
      "type": "frames",
      "frames": [
        "assets/monster/up_0.png",
        "assets/monster/up_1.png",
        "assets/monster/up_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "👾"
    },
    "down": {
      "type": "frames",
      "frames": [
        "assets/monster/down_0.png",
        "assets/monster/down_1.png",
        "assets/monster/down_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "👾"
    },
    "left": {
      "type": "frames",
      "frames": [
        "assets/monster/left_0.png",
        "assets/monster/left_1.png",
        "assets/monster/left_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "👾"
    },
    "right": {
      "type": "frames",
      "frames": [
        "assets/monster/right_0.png",
        "assets/monster/right_1.png",
        "assets/monster/right_2.png"
      ],
      "fps": 6,
      "loop": true,
      "emoji": "👾"
    },
    "attack": {
      "type": "frames",
      "frames": [
        "assets/monster/attack_0.png",
        "assets/monster/attack_1.png",
        "assets/monster/attack_2.png"
      ],
      "fps": 6,
      "loop": false,
      "emoji": "👹"
    }
  },
  "bomb": {
    "idle": {
      "type": "frames",
      "frames": [
        "assets/bomb/idle_0.png",
        "assets/bomb/idle_1.png",
        "assets/bomb/idle_2.png"
      ],
      "fps": 4,
      "loop": true,
      "emoji": "💣"
    },
    "explosion": {
      "type": "frames",
      "frames": [
        "assets/effects/explosion_0.png",
        "assets/effects/explosion_1.png",
        "assets/effects/explosion_2.png",
        "assets/effects/explosion_3.png",
        "assets/effects/explosion_4.png"
      ],
      "fps": 10,
      "loop": false,
      "emoji": "💥"
    }
  },
  "box": {
    "intact": {
      "type": "image",
      "src": "assets/environment/box_intact.png",
      "emoji": null
    },
    "damaged": {
      "type": "image",
      "src": "assets/environment/box_damaged.png",
      "emoji": null,
      "_note": "extracted but not currently wired into gameplay -- intact switches straight to destroyed on explosion"
    },
    "destroyed": {
      "type": "image",
      "src": "assets/environment/box_destroyed.png",
      "emoji": null,
      "_note": "also currently unused -- destroyed boxes revert to a plain floor tile instead of showing debris art"
    }
  },
  "reward": {
    "type": "frames",
    "frames": [
      "assets/reward/idle_0.png",
      "assets/reward/idle_1.png"
    ],
    "fps": 2,
    "loop": true,
    "emoji": "🎁"
  },
  "safePoint": {
    "idle": {
      "type": "image",
      "src": "assets/environment/safepoint_idle.png",
      "emoji": "🛡️"
    },
    "glow": {
      "type": "image",
      "src": "assets/environment/safepoint_glow.png",
      "emoji": "🛡️",
      "_note": "extracted but not currently wired in -- idle art is used at all times"
    }
  },
  "deco": {
    "tree": {
      "type": "image",
      "src": "assets/environment/tree.png",
      "emoji": "🌲"
    },
    "bush": {
      "type": "image",
      "src": "assets/environment/bush.png",
      "emoji": "🏮"
    },
    "snowman": {
      "type": "image",
      "src": "assets/environment/snowman.png",
      "emoji": "⛄"
    }
  },
  "tileOverlays": {
    "_note": "Selectable/selected/path-preview/blocked tile-frame art. If 'src' is set and the image loads, it is drawn as a border/frame overlay on top of the tile (replacing the built-in CSS highlight for that state); leave 'src' null to keep the current CSS-only look. 'selectable' is the tile a player can currently click/hover to move to.",
    "selectable": {
      "type": "image",
      "src": null,
      "emoji": null
    },
    "selected": {
      "type": "image",
      "src": null,
      "emoji": null
    },
    "pathPreview": {
      "type": "image",
      "src": null,
      "emoji": null
    },
    "blocked": {
      "type": "image",
      "src": null,
      "emoji": null
    }
  }
};

  function resolveFromConfig(node){
    if(!node) return null;
    if(node.type==='frames'){
      return { frames:(node.frames||[]), fps:node.fps, loop:node.loop, emoji:node.emoji, mirror:!!node.mirror };
    }
    if(node.type==='image'){
      return { src:node.src, emoji:node.emoji };
    }
    if(node.type==='emoji'){ return { emoji:node.emoji }; }
    return null;
  }

  function buildAssets(cfg){
    return {
      player:{
        idle:  resolveFromConfig(cfg.player.idle),
        up:    resolveFromConfig(cfg.player.up),
        down:  resolveFromConfig(cfg.player.down),
        left:  resolveFromConfig(cfg.player.left),
        right: resolveFromConfig(cfg.player.right),
        die:   resolveFromConfig(cfg.player.die)
      },
      monster:{
        idle:  resolveFromConfig(cfg.monster.idle),
        up:    resolveFromConfig(cfg.monster.up),
        down:  resolveFromConfig(cfg.monster.down),
        left:  resolveFromConfig(cfg.monster.left),
        right: resolveFromConfig(cfg.monster.right),
        attack:resolveFromConfig(cfg.monster.attack)
      },
      bomb:{
        idle:      resolveFromConfig(cfg.bomb.idle),
        explosion: resolveFromConfig(cfg.bomb.explosion)
      },
      box:{
        intact:    resolveFromConfig(cfg.box.intact),
        destroyed: resolveFromConfig(cfg.box.destroyed)
      },
      reward:    resolveFromConfig(cfg.reward),
      safePoint: resolveFromConfig(cfg.safePoint.idle),
      deco:{
        tree:    resolveFromConfig(cfg.deco.tree),
        bush:    resolveFromConfig(cfg.deco.bush),
        snowman: resolveFromConfig(cfg.deco.snowman)
      },
      tile:{
        empty: resolveFromConfig(cfg.tile && cfg.tile.empty)
      },
      tileOverlays:{
        selectable:  resolveFromConfig(cfg.tileOverlays && cfg.tileOverlays.selectable),
        selected:    resolveFromConfig(cfg.tileOverlays && cfg.tileOverlays.selected),
        pathPreview: resolveFromConfig(cfg.tileOverlays && cfg.tileOverlays.pathPreview),
        blocked:     resolveFromConfig(cfg.tileOverlays && cfg.tileOverlays.blocked)
      }
    };
  }

  // Loads assets.json (real file on disk, fetched fresh) and builds the
  // global ASSETS object every gameplay visual resolves itself from.
  window.loadBomberGirlAssets = async function(){
    let cfg = null;
    try{
      const resp = await fetch('assets.json', { cache:'no-store' });
      if(resp.ok){
        cfg = await resp.json();
        console.info('[BomberGirl] assets.json loaded from disk:', new URL('assets.json', document.baseURI).href);
      } else {
        console.warn('[BomberGirl] assets.json request returned status', resp.status, '- using built-in fallback config instead.');
      }
    }catch(e){
      console.warn('[BomberGirl] could not fetch assets.json (', e.message, ') - using built-in fallback config instead.');
    }
    if(!cfg) cfg = ASSET_CONFIG_FALLBACK;
    window.ASSETS = buildAssets(cfg);
    console.info('[BomberGirl] page base URL is:', document.baseURI, '- images are requested relative to this.');
    return window.ASSETS;
  };
})();
