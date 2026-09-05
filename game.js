window.startBomberGirl = function(){
  'use strict';

  /* ================= CONFIG (data-driven) ================= */
  const CONFIG = {
    board:{ cols:10, rows:6 },
    movement:{ characterMoveDuration:180 },      // ms per tile step
    bomb:{ countdown:900, range:1, explosionDuration:500 },
    content:{ rewardChance:70 }, // chance a non-monster box holds a reward vs. empty; the monster is placed once at board-gen (see MONSTER SYSTEM), not rolled per box
    reward:{ multiplierIncrease:0.25 },
    monster:{ moveDuration:300 },
    density:{ decoChance:0.13 } // chance any remaining box cell becomes a permanent (non-destroyable) obstacle
  };


  /* asset resolution: image/sprite if configured and loadable, else emoji.
     Works uniformly for every gameplay object (player/monster/bomb/box/reward/
     safe point/environment) per the data-driven asset requirement. */
  function resolveAsset(entry, fallback){
    if(!entry) return fallback||'';
    if(entry.emoji!==undefined) return entry; // rich visual spec (frames/src + emoji fallback) — used via mountSprite
    if(entry.type==='spriteSheet' && entry.value){ return {sprite:entry.value}; }
    if(entry.type==='image' && entry.value){ return {image:entry.value}; }
    if(entry.type==='emoji' && entry.value){ return entry.value; }
    return fallback||'';
  }

  /* ================= SPRITE MOUNTING (image -> fallback emoji, per-element) ================= */
  function stopSprite(el){
    if(el && el._spriteTimer){ clearInterval(el._spriteTimer); el._spriteTimer=null; }
  }
  // spec: {frames:[dataURI,...], fps, loop, emoji, mirror} or {src:dataURI, emoji} or a plain emoji string
  const _imgProbeCache = new Map(); // url -> true(ok)/false(failed), avoids re-probing every frame tick
  let _loggedAssetWarning = false;
  function useEmojiFallback(el, spec, url){
    if(url && !_imgProbeCache.get('__warned__'+url)){
      _imgProbeCache.set('__warned__'+url, true);
      console.warn('[BomberGirl] image failed to load, using emoji fallback. Requested path:', url, '| Resolved absolute URL:', new URL(url, document.baseURI).href);
    }
    el.classList.remove('spriteBox');
    el.style.backgroundImage='';
    el.textContent = (spec && spec.emoji) || '';
  }

  /* Applies an optional image (from assets.json) as the element's
     background. Unlike mountSprite/useEmojiFallback, there is no emoji
     fallback here -- if no image is configured, or it fails to load, the
     element is simply left alone so the existing CSS (gradient tile
     background, box-shadow border, etc.) shows through exactly as before. */
  function applyOptionalBackgroundImage(el, spec){
    const url = spec && spec.src;
    if(!url){ el.style.backgroundImage=''; return; }
    if(_imgProbeCache.get(url)===false){ el.style.backgroundImage=''; return; }
    el.style.backgroundImage = `url("${url}")`;
    if(_imgProbeCache.get(url)!==true){
      const probe = new Image();
      probe.onload = ()=>{ _imgProbeCache.set(url,true); };
      probe.onerror = ()=>{
        _imgProbeCache.set(url,false);
        el.style.backgroundImage='';
        if(!_imgProbeCache.get('__warned__'+url)){
          _imgProbeCache.set('__warned__'+url, true);
          console.warn('[BomberGirl] tile image failed to load, keeping default look. Requested path:', url, '| Resolved absolute URL:', new URL(url, document.baseURI).href);
        }
      };
      probe.src = url;
    }
  }

  /* Applies an optional border/frame overlay image (e.g. for the
     hover/selectable tile state) as a separate layer on top of the tile's
     own content, so it doesn't interfere with sprites already mounted on
     the cell. When a real image successfully loads, the built-in CSS
     highlight (box-shadow) for that state is hidden via .hasOverlayArt so
     the two don't visually stack; otherwise the CSS highlight is untouched. */
  function applyOverlayArt(el, spec){
    const url = spec && spec.src;
    let art = el.querySelector(':scope > .tileOverlayArt');
    if(!url || _imgProbeCache.get(url)===false){
      if(art) art.remove();
      el.classList.remove('hasOverlayArt');
      return;
    }
    if(!art){
      art = document.createElement('div');
      art.className = 'tileOverlayArt';
      el.appendChild(art);
    }
    art.style.backgroundImage = `url("${url}")`;
    el.classList.add('hasOverlayArt');
    if(_imgProbeCache.get(url)!==true){
      const probe = new Image();
      probe.onload = ()=>{ _imgProbeCache.set(url,true); };
      probe.onerror = ()=>{
        _imgProbeCache.set(url,false);
        if(art) art.remove();
        el.classList.remove('hasOverlayArt');
        if(!_imgProbeCache.get('__warned__'+url)){
          _imgProbeCache.set('__warned__'+url, true);
          console.warn('[BomberGirl] tile overlay image failed to load, keeping default border. Requested path:', url, '| Resolved absolute URL:', new URL(url, document.baseURI).href);
        }
      };
      probe.src = url;
    }
  }

  function mountSprite(el, spec, onComplete){
    stopSprite(el);
    el.style.backgroundImage='';
    el.style.transform = (spec && spec.mirror) ? 'scaleX(-1)' : '';
    el.classList.remove('spriteBox');
    el.textContent='';

    if(typeof spec==='string'){ el.textContent = spec; return; }
    if(!spec){ return; }

    // Real image files (loaded from assets.json) can fail to load if the
    // referenced file is missing; fall back to the emoji from assets.json
    // in that case, per the asset config's documented contract.
    function applyUrl(url){
      // Already confirmed broken -> go straight to emoji, no flicker.
      if(_imgProbeCache.get(url)===false){ useEmojiFallback(el, spec, url); return; }
      // Show the image immediately (no waiting on a probe first) so sprites
      // never sit blank while a file loads; only swap to the emoji fallback
      // if the browser later confirms the file actually failed to load.
      el.classList.add('spriteBox');
      el.style.backgroundImage = `url("${url}")`;
      if(_imgProbeCache.get(url)!==true){
        const probe = new Image();
        probe.onload = ()=>{ _imgProbeCache.set(url,true); };
        probe.onerror = ()=>{ _imgProbeCache.set(url,false); useEmojiFallback(el, spec, url); };
        probe.src = url;
      }
    }

    if(spec.frames && spec.frames.length){
      el.classList.add('spriteBox');
      let i=0;
      const setFrame=()=>{ applyUrl(spec.frames[i]); };
      setFrame();
      if(spec.frames.length>1){
        const interval = 1000/(spec.fps||4);
        el._spriteTimer = setInterval(()=>{
          i++;
          if(i>=spec.frames.length){
            if(!spec.loop){
              clearInterval(el._spriteTimer); el._spriteTimer=null;
              if(onComplete) onComplete();
              return;
            }
            i=0;
          }
          setFrame();
        }, interval);
      }
    } else if(spec.src){
      applyUrl(spec.src);
    } else if(spec.emoji){
      el.textContent = spec.emoji;
    }
  }

  /* ================= STATE ================= */
  const COLS = CONFIG.board.cols, ROWS = CONFIG.board.rows;
  let balance = 500;
  let bet = 50;
  let grid = [];              // 2d array [row][col] of cell objects
  let safePos = null;         // {r,c}
  let playerPos = null;       // {r,c}
  let multiplier = 1.00;
  let rewardsFound = 0;
  let gameActive = false;
  let phase = 'IDLE';         // READY, MOVING_TO_TARGET, PLANTING_BOMB, RETURNING_TO_SAFE, WAITING_FOR_EXPLOSION, RESOLVING_EXPLOSION, GAME_OVER
  let hoverPathCells = [];
  let monsterBoxKey = null;   // the ONE box (r_c) that secretly holds the monster
  let monsterTimerId = null;

  // ===== single source of truth for the monster (rule: exactly ONE monster per game) =====
  const gameState = {
    monster: {
      discovered:false,
      active:false,
      state:'HIDDEN',   // HIDDEN -> DISCOVERED -> CHASING -> ATTACKING -> PLAYER_DEAD
      position:null
    }
  };

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('statusText');
  const phaseTextTop = document.getElementById('phaseTextTop');
  const endBtn = document.getElementById('endBtn');
  const betValEl = document.getElementById('betVal');
  const multValEl = document.getElementById('multVal');
  const stepLabel = document.getElementById('stepLabel');
  const safeStepVal = document.getElementById('safeStepVal');
  const payoutPreview = document.getElementById('payoutPreview');
  const dotsEl = document.getElementById('dots');
  const overlay = document.getElementById('overlay');
  const cardTitle = document.getElementById('cardTitle');
  const cardSub = document.getElementById('cardSub');
  const cardPayout = document.getElementById('cardPayout');
  const restartBtn = document.getElementById('restartBtn');

  document.documentElement.style.setProperty('--moveDur', CONFIG.movement.characterMoveDuration+'ms');

  function buildDots(){
    dotsEl.innerHTML='';
    for(let i=0;i<10;i++){ const d=document.createElement('i'); dotsEl.appendChild(d); }
  }
  buildDots();

  function bgDecor(){
    const wrap=document.getElementById('bgdeco');
    const icons=['🌲','❄️','🌲','❄️'];
    for(let i=0;i<14;i++){
      const s=document.createElement('span');
      s.textContent=icons[i%icons.length];
      s.style.left=(Math.random()*100)+'%';
      s.style.top=(Math.random()*100)+'%';
      s.style.fontSize=(20+Math.random()*30)+'px';
      wrap.appendChild(s);
    }
  }
  bgDecor();

  /* ================= BOARD GENERATION ================= */
  function key(r,c){ return r+'_'+c; }

  function generateBoard(){
    const MAX_ATTEMPTS = 12;
    let attempt = 0;
    let ok = false;
    while(attempt < MAX_ATTEMPTS && !ok){
      attempt++;
      buildRawBoard();
      ok = validateBoard();
    }
    // buildRawBoard always leaves a valid connected carve by construction;
    // the loop + validateBoard is a safety net rather than a strict requirement.

    playerPos = { r: safePos.r, c: safePos.c };

    // ---- pick exactly ONE box in the whole board to secretly hold the monster ----
    const boxCells = [];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(grid[r][c].kind==='box') boxCells.push({r,c});
    if(boxCells.length>0){
      const pick = boxCells[Math.floor(Math.random()*boxCells.length)];
      monsterBoxKey = key(pick.r,pick.c);
    } else {
      monsterBoxKey = null;
    }

    // reset the single monster's state for this run
    if(monsterTimerId){ clearTimeout(monsterTimerId); monsterTimerId=null; }
    gameState.monster.discovered=false;
    gameState.monster.active=false;
    gameState.monster.state='HIDDEN';
    gameState.monster.position=null;
  }

  // ---- board carving: start as all obstacles, carve a connected corridor network
  // outward from the Safe Point, so every open tile is guaranteed reachable. ----
  function buildRawBoard(){
    grid = [];
    for(let r=0;r<ROWS;r++){
      const row=[];
      for(let c=0;c<COLS;c++) row.push({ r,c, kind:'box', destroyed:false, content:null, revealed:false });
      grid.push(row);
    }
    safePos = { r: ROWS-1, c: Math.floor(COLS/2) };
    grid[safePos.r][safePos.c].kind = 'safepoint';

    const total = COLS*ROWS;
    const targetOpen = Math.round(total * 0.5); // ~50% of the board becomes open path
    const visited = new Set([key(safePos.r,safePos.c)]);
    const stack = [safePos];
    let openCount = 0;

    function shuffledNeighbors(p){
      const n = [
        {r:p.r-1,c:p.c},{r:p.r+1,c:p.c},{r:p.r,c:p.c-1},{r:p.r,c:p.c+1}
      ].filter(q=>q.r>=0&&q.c>=0&&q.r<ROWS&&q.c<COLS);
      for(let i=n.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [n[i],n[j]]=[n[j],n[i]]; }
      return n;
    }

    // randomized DFS "drunkard's walk" carve — produces a single connected
    // network of corridors/rooms with branches and dead ends, by construction.
    while(stack.length>0 && openCount<targetOpen){
      const current = stack[stack.length-1];
      const options = shuffledNeighbors(current).filter(n=>!visited.has(key(n.r,n.c)));
      if(options.length===0){ stack.pop(); continue; }
      const next = options[0];
      visited.add(key(next.r,next.c));
      grid[next.r][next.c].kind = Math.random()<0.28 ? 'snow' : 'floor';
      openCount++;
      stack.push(next);
    }

    // add a handful of extra openings so corridors get intersections / loops
    // instead of a purely single-path maze (still only ever replacing a box
    // with floor, so this can only add connectivity, never remove it).
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(grid[r][c].kind!=='box') continue;
        const openNeighbors = [
          {r:r-1,c},{r:r+1,c},{r,c:c-1},{r,c:c+1}
        ].filter(p=>p.r>=0&&p.c>=0&&p.r<ROWS&&p.c<COLS)
         .filter(p=>{ const k=grid[p.r][p.c].kind; return k==='floor'||k==='snow'||k==='safepoint'; });
        if(openNeighbors.length>=2 && Math.random()<0.18){
          grid[r][c].kind = Math.random()<0.28 ? 'snow' : 'floor';
        }
      }
    }

    // guarantee the Safe Point isn't boxed in: force-open extra neighbors if needed
    ensureSafePointConnections();

    // scatter a few permanent decorative obstacles (never destroyable) among
    // whatever is still a box — doesn't affect connectivity since boxes were
    // never walkable to begin with.
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        if(grid[r][c].kind==='box' && Math.random()<CONFIG.density.decoChance){
          grid[r][c].kind='deco';
          const opts = Object.keys(ASSETS.deco);
          grid[r][c].decoType = opts[Math.floor(Math.random()*opts.length)];
        }
      }
    }
  }

  function ensureSafePointConnections(){
    const neighbors = [
      {r:safePos.r-1,c:safePos.c},{r:safePos.r+1,c:safePos.c},
      {r:safePos.r,c:safePos.c-1},{r:safePos.r,c:safePos.c+1}
    ].filter(p=>p.r>=0&&p.c>=0&&p.r<ROWS&&p.c<COLS);
    let openCount = neighbors.filter(p=>{
      const k=grid[p.r][p.c].kind; return k==='floor'||k==='snow';
    }).length;
    for(const p of neighbors){
      if(openCount>=2) break;
      const k = grid[p.r][p.c].kind;
      if(k==='box' || k==='deco'){
        grid[p.r][p.c].kind = 'floor';
        openCount++;
      }
    }
  }

  // BFS-based validation: Safe Point walkable, has >=2 open neighbors, and a
  // healthy number of open+reachable tiles exist for meaningful play.
  function validateBoard(){
    if(grid[safePos.r][safePos.c].kind!=='safepoint') return false;
    const neighbors = [
      {r:safePos.r-1,c:safePos.c},{r:safePos.r+1,c:safePos.c},
      {r:safePos.r,c:safePos.c-1},{r:safePos.r,c:safePos.c+1}
    ].filter(p=>p.r>=0&&p.c>=0&&p.r<ROWS&&p.c<COLS);
    const openNeighborCount = neighbors.filter(p=>{
      const k=grid[p.r][p.c].kind; return k==='floor'||k==='snow';
    }).length;
    if(openNeighborCount<2) return false;

    // BFS from safe point over floor/snow/safepoint tiles
    const seen = new Set([key(safePos.r,safePos.c)]);
    const q = [safePos];
    let reachableOpen = 0;
    while(q.length){
      const cur = q.shift();
      const nbs = [
        {r:cur.r-1,c:cur.c},{r:cur.r+1,c:cur.c},{r:cur.r,c:cur.c-1},{r:cur.r,c:cur.c+1}
      ];
      for(const nb of nbs){
        if(nb.r<0||nb.c<0||nb.r>=ROWS||nb.c>=COLS) continue;
        const k = key(nb.r,nb.c);
        if(seen.has(k)) continue;
        const kind = grid[nb.r][nb.c].kind;
        if(kind==='floor'||kind==='snow'||kind==='safepoint'){
          seen.add(k);
          reachableOpen++;
          q.push(nb);
        }
      }
    }
    return reachableOpen >= 14; // enough room for a meaningful run
  }

  function isWalkable(r,c){

    if(r<0||c<0||r>=ROWS||c>=COLS) return false;
    const cell = grid[r][c];
    if(cell.kind==='deco') return false;
    if(cell.kind==='box' && !cell.destroyed) return false;
    return true;
  }
  // the monster is never allowed to path onto or through the Safe Point
  function isWalkableForMonster(r,c){
    if(!isWalkable(r,c)) return false;
    if(r===safePos.r && c===safePos.c) return false;
    return true;
  }

  /* ================= A* PATHFINDING ================= */
  function astar(start, goal, walkableFn){
    walkableFn = walkableFn || isWalkable;
    if(start.r===goal.r && start.c===goal.c) return [start];
    const open = new Map();
    const startKey = key(start.r,start.c);
    open.set(startKey, { pos:start, g:0, f:heuristic(start,goal), parent:null });
    const closed = new Set();

    function heuristic(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c); }

    while(open.size>0){
      // pick node with lowest f, deterministic tie-break by key order
      let currentKey=null, current=null;
      for(const [k,node] of open){
        if(!current || node.f<current.f || (node.f===current.f && k<currentKey)){
          current=node; currentKey=k;
        }
      }
      if(current.pos.r===goal.r && current.pos.c===goal.c){
        // reconstruct
        const path=[];
        let n=current;
        while(n){ path.unshift(n.pos); n=n.parent; }
        return path;
      }
      open.delete(currentKey);
      closed.add(currentKey);

      const neighbors = [
        {r:current.pos.r-1,c:current.pos.c},
        {r:current.pos.r+1,c:current.pos.c},
        {r:current.pos.r,c:current.pos.c-1},
        {r:current.pos.r,c:current.pos.c+1}
      ];
      for(const nb of neighbors){
        const nk = key(nb.r,nb.c);
        if(closed.has(nk)) continue;
        if(!walkableFn(nb.r,nb.c)) continue;
        const g = current.g+1;
        const existing = open.get(nk);
        if(!existing || g<existing.g){
          open.set(nk, { pos:nb, g, f:g+heuristic(nb,goal), parent:current });
        }
      }
    }
    return null; // no path
  }

  /* a tile is selectable only if it is EMPTY + WALKABLE + REACHABLE + NOT OCCUPIED —
     boxes/obstacles/the Safe Point/the player's own tile/the monster's tile are
     never valid destinations. Boxes are only ever destroyed by a nearby explosion. */
  function isSelectableTile(r,c){
    const cell = grid[r][c];
    if(cell.kind==='deco') return false;
    if(cell.kind==='safepoint') return false;
    if(cell.kind==='box' && !cell.destroyed) return false;
    if(playerPos.r===r && playerPos.c===c) return false;
    const m = gameState.monster;
    if(m.discovered && m.position && m.position.r===r && m.position.c===c) return false;
    return true;
  }

  /* ================= RENDER ================= */
  function render(){
    stopSprite(document.getElementById('playerActor'));
    stopSprite(document.getElementById('monsterActor'));
    boardEl.innerHTML='';
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const cell = grid[r][c];
        const el = document.createElement('div');
        let cls = 'cell';
        if(cell.kind==='snow') cls+=' snow';
        if(cell.kind==='deco') cls+=' deco';
        if(cell.kind==='floor') cls+=' floor';
        if(cell.kind==='safepoint') cls+=' safepoint';
        if(cell.kind==='box'){
          cls+=' box';
          if(cell.destroyed) cls+=' destroyed';
        }
        el.className = cls;
        el.dataset.r=r; el.dataset.c=c;

        if(cell.kind==='snow' || cell.kind==='floor'){
          applyOptionalBackgroundImage(el, ASSETS.tile && ASSETS.tile.empty);
        }

        if(cell.kind==='deco'){
          mountSprite(el, ASSETS.deco[cell.decoType] || ASSETS.deco.tree);
        }
        if(cell.kind==='safepoint'){
          mountSprite(el, ASSETS.safePoint);
        }
        if(cell.kind==='box'){
          mountSprite(el, cell.destroyed ? null : ASSETS.box.intact);
        }
        if(cell.kind==='box' && cell.destroyed && cell.revealed && cell.content==='reward'){
          mountSprite(el, ASSETS.reward);
        }
        boardEl.appendChild(el);
      }
    }
    refreshTargetable();
    positionActor('player', playerPos, ASSETS.player.idle);
    if(gameState.monster.discovered && gameState.monster.position && gameState.monster.state!=='PLAYER_DEAD'){
      positionActor('monster', gameState.monster.position, ASSETS.monster.idle);
    }
  }

  function cellEl(r,c){ return boardEl.children[r*COLS+c]; }

  function refreshTargetable(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const el = cellEl(r,c);
        el.classList.remove('selectable');
        let isTargetable = false;
        if(phase==='READY' && isSelectableTile(r,c)){
          const path = astar(playerPos, {r,c});
          if(path){ el.classList.add('selectable'); isTargetable = true; }
        }
        applyOverlayArt(el, isTargetable ? (ASSETS.tileOverlays && ASSETS.tileOverlays.selectable) : null);
      }
    }
  }

  function positionActor(kind, pos, visual, onComplete){
    let el = document.getElementById(kind+'Actor');
    if(!el){
      el = document.createElement('div');
      el.id = kind+'Actor';
      el.className = kind;
      boardEl.appendChild(el);
    }
    if(visual!==undefined) mountSprite(el, visual, onComplete);
    const pct = 100/COLS, pctR = 100/ROWS;
    el.style.left = (pos.c*pct)+'%';
    el.style.top = (pos.r*pctR)+'%';
    el.style.width = pct+'%';
    el.style.height = pctR+'%';
  }

  // picks the correct directional sprite entry (up/down/left/right) for a step from a->b
  function directionVisual(assetGroup, from, to, idleVisual){
    if(!from || !to || (from.r===to.r && from.c===to.c)) return idleVisual;
    if(to.r < from.r) return assetGroup.up;
    if(to.r > from.r) return assetGroup.down;
    if(to.c < from.c) return assetGroup.left;
    if(to.c > from.c) return assetGroup.right;
    return idleVisual;
  }

  function removeActor(kind){
    const el = document.getElementById(kind+'Actor');
    if(el){ stopSprite(el); el.remove(); }
  }

  /* ================= HUD ================= */
  function refreshHud(){
    betValEl.textContent = bet;
    multValEl.textContent = 'x'+multiplier.toFixed(2);
    stepLabel.textContent = 'RISK RUN · SAFE '+rewardsFound;
    safeStepVal.textContent = rewardsFound;
    payoutPreview.textContent = '🪙 '+(bet*multiplier).toFixed(2);
    const dots = dotsEl.children;
    for(let i=0;i<dots.length;i++) dots[i].classList.toggle('on', i<rewardsFound);
    endBtn.disabled = gameActive && phase!=='READY';
    endBtn.textContent = gameActive ? 'END GAME' : 'START';
  }

  function setStatus(msg, topMsg){
    statusEl.innerHTML = msg;
    phaseTextTop.textContent = topMsg||msg.replace(/<[^>]+>/g,'');
  }

  /* ================= GAME FLOW ================= */
  function startRound(){
    if(gameActive) return;
    if(bet>balance){ setStatus('Not enough coins for that bet.'); return; }
    balance -= bet;
    multiplier = 1.00;
    rewardsFound = 0;
    gameActive = true;
    generateBoard();
    render();
    phase='READY';
    refreshHud();
    refreshTargetable();
    setStatus('Select an empty tile · Bomber Girl will walk there, plant a bomb, and the blast will destroy nearby boxes','SELECT A TILE');
  }

  function onCellClick(r,c){
    if(!gameActive || phase!=='READY') return;
    if(!isSelectableTile(r,c)){
      flashInvalid(r,c);
      return;
    }
    const path = astar(playerPos, {r,c});
    if(!path){
      flashInvalid(r,c);
      setStatus('No valid path to that tile right now.','BLOCKED');
      return;
    }
    runBombCycle({r,c}, path);
  }

  function flashInvalid(r,c){
    const el = cellEl(r,c);
    el.classList.add('invalid-flash');
    setTimeout(()=>el.classList.remove('invalid-flash'), 350);
  }

  function movePlayerAlong(path, onDone){
    let i=1; // path[0] is current position
    if(path.length<=1){ onDone(); return; }
    function step(){
      if(gameState.monster.state==='PLAYER_DEAD') return; // loss already resolved, halt
      if(i>=path.length){ onDone(); return; }
      const from = playerPos;
      playerPos = path[i];
      positionActor('player', playerPos, directionVisual(ASSETS.player, from, playerPos, ASSETS.player.idle));
      i++;
      if(checkCollision()) return; // a moving player can walk straight into the monster
      setTimeout(step, CONFIG.movement.characterMoveDuration);
    }
    step();
  }

  function runBombCycle(targetPos, pathToTarget){
    phase='MOVING_TO_TARGET';
    refreshHud(); refreshTargetable();
    setStatus('Bomber Girl is walking to the tile…','MOVING...');

    movePlayerAlong(pathToTarget, ()=>{
      phase='PLANTING_BOMB';
      positionActor('player', playerPos, ASSETS.player.idle); // arrived — stop the walk cycle
      setStatus('Planting bomb…','BOMB PLANTED');
      const bombEl = document.createElement('span');
      bombEl.className='bomb';
      mountSprite(bombEl, ASSETS.bomb.idle);
      cellEl(targetPos.r,targetPos.c).appendChild(bombEl);

      setTimeout(()=>{
        // return to safe point
        phase='RETURNING_TO_SAFE';
        setStatus('Returning to the Safe Point…','RETURNING TO SAFE POINT');
        const returnPath = astar(playerPos, safePos) || [playerPos, safePos];
        movePlayerAlong(returnPath, ()=>{
          phase='WAITING_FOR_EXPLOSION';
          positionActor('player', playerPos, ASSETS.player.idle); // back home — idle again
          setStatus('Safe. Waiting for the bomb…','WAITING...');
          setTimeout(()=>{
            explode(targetPos, bombEl);
          }, 250);
        });
      }, 300);
    });
  }

  function explode(center, bombEl){
    phase='RESOLVING_EXPLOSION';
    stopSprite(bombEl);
    if(bombEl && bombEl.parentNode) bombEl.parentNode.removeChild(bombEl);
    setStatus('Bomb exploded!','BOOM!');

    const range = CONFIG.bomb.range;
    const affected = [];
    affected.push(center);
    const dirs = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
    dirs.forEach(d=>{
      for(let step=1;step<=range;step++){
        const r=center.r+d.dr*step, c=center.c+d.dc*step;
        if(r<0||c<0||r>=ROWS||c>=COLS) break;
        affected.push({r,c});
        if(grid[r][c].kind==='deco') break; // blocked by permanent obstacle
      }
    });

    affected.forEach(pos=>{
      const el = cellEl(pos.r,pos.c);
      const boom = document.createElement('span');
      boom.className='boom';
      mountSprite(boom, ASSETS.bomb.explosion);
      el.appendChild(boom);
      setTimeout(()=>{ stopSprite(boom); if(boom.parentNode) boom.parentNode.removeChild(boom); }, CONFIG.bomb.explosionDuration);
    });

    setTimeout(()=>{ resolveContents(affected); }, CONFIG.bomb.explosionDuration);
  }

  function resolveContents(affected){
    phase='RESOLVING_CONTENT';
    let justDiscoveredMonsterAt = null;
    let rewardCount = 0;

    affected.forEach(pos=>{
      const cell = grid[pos.r][pos.c];
      if(cell.kind==='box' && !cell.destroyed){
        cell.destroyed = true;
        cell.revealed = true;

        // centralized check: only the ONE designated box may ever contain the monster,
        // and only if it has not already been discovered this game.
        const isTheMonsterBox = (key(pos.r,pos.c) === monsterBoxKey);
        if(isTheMonsterBox && !gameState.monster.discovered){
          cell.content = 'monster';
          justDiscoveredMonsterAt = pos;
        } else {
          // every other box (and the monster box if somehow re-hit after discovery,
          // which cannot happen since it is destroyed on first hit) resolves normally
          const roll = Math.random()*100;
          if(roll < CONFIG.content.rewardChance){
            cell.content='reward';
            rewardCount++;
          } else {
            cell.content='empty';
          }
        }
      }
    });

    render(); // reflect destroyed boxes / walkability changes

    if(rewardCount>0){
      multiplier = +(multiplier + CONFIG.reward.multiplierIncrease*rewardCount).toFixed(2);
      rewardsFound += rewardCount;
      bumpMultiplier();
      refreshHud();
    }

    if(justDiscoveredMonsterAt){
      discoverMonster(justDiscoveredMonsterAt);
      if(rewardCount>0) setStatus('<b>MONSTER!</b> Something is chasing Bomber Girl… (reward also found)','MONSTER!');
      else setStatus('<b>MONSTER!</b> Something is chasing Bomber Girl…','MONSTER!');
      backToReady();
    } else {
      if(rewardCount>0) setStatus('<b>REWARD FOUND!</b> Multiplier increased.','REWARD FOUND!');
      else setStatus('Nothing there. Pick another tile.','SELECT A TILE');
      backToReady();
    }
  }

  function bumpMultiplier(){
    multValEl.classList.remove('bump'); void multValEl.offsetWidth; multValEl.classList.add('bump');
    const fp=document.createElement('span'); fp.className='floatplus'; fp.textContent='+'+CONFIG.reward.multiplierIncrease.toFixed(2);
    multValEl.appendChild(fp);
    setTimeout(()=>fp.remove(), 800);
  }

  function backToReady(){
    phase='READY';
    refreshHud();
    refreshTargetable();
  }

  /* ================= THE ONE MONSTER — centralized state machine =================
     HIDDEN -> DISCOVERED -> CHASING -> ATTACKING -> PLAYER_DEAD
     gameState.monster is the single source of truth; every system reads it here. */

  function discoverMonster(pos){
    if(gameState.monster.discovered) return; // guard: can only ever fire once per game
    gameState.monster.discovered = true;
    gameState.monster.active = true;
    gameState.monster.state = 'DISCOVERED';
    gameState.monster.position = { ...pos };
    positionActor('monster', gameState.monster.position, ASSETS.monster.idle);

    // discovery immediately activates the chase — it does not wait for the
    // player to select another tile.
    gameState.monster.state = 'CHASING';
    scheduleMonsterTick();
  }

  function scheduleMonsterTick(){
    if(monsterTimerId) clearTimeout(monsterTimerId);
    monsterTimerId = setTimeout(monsterTick, CONFIG.monster.moveDuration);
  }

  function monsterTick(){
    const m = gameState.monster;
    if(!gameActive || m.state==='PLAYER_DEAD' || !m.active) return;

    // player standing in the Safe Point is fully protected: the monster cannot
    // path through/onto it, so it simply holds its ground and keeps watching.
    const path = astar(m.position, playerPos, isWalkableForMonster);

    if(path && path.length>1){
      const from = m.position;
      m.position = path[1];
      positionActor('monster', m.position, directionVisual(ASSETS.monster, from, m.position, ASSETS.monster.idle));
    } else {
      // no path (player is safe, or genuinely blocked) — monster idles in place
      positionActor('monster', m.position, ASSETS.monster.idle);
    }

    if(checkCollision()) return; // may trigger ATTACKING/PLAYER_DEAD and stop the loop

    scheduleMonsterTick();
  }

  // shared collision check, called after every player step AND every monster step
  function checkCollision(){
    const m = gameState.monster;
    if(!m.discovered || m.state==='PLAYER_DEAD' || !m.position) return false;
    const playerIsSafe = (playerPos.r===safePos.r && playerPos.c===safePos.c);
    if(playerIsSafe) return false; // Safe Point rule: never a lose condition while inside it
    if(m.position.r===playerPos.r && m.position.c===playerPos.c){
      triggerPlayerDeath();
      return true;
    }
    return false;
  }

  function triggerPlayerDeath(){
    const m = gameState.monster;
    m.state = 'ATTACKING';
    if(monsterTimerId){ clearTimeout(monsterTimerId); monsterTimerId=null; }
    positionActor('monster', m.position, ASSETS.monster.attack);
    positionActor('player', playerPos, ASSETS.player.die);
    setStatus('<b>CAUGHT!</b> The monster reached Bomber Girl.','GAME OVER');
    setTimeout(()=>{
      m.state = 'PLAYER_DEAD';
      m.active = false;
      endRound(false);
    }, 600);
  }

  /* ---------------- end / restart ---------------- */
  function endRound(won){
    gameActive=false;
    phase='GAME_OVER';
    if(monsterTimerId){ clearTimeout(monsterTimerId); monsterTimerId=null; }
    refreshHud();
    const payout = won ? bet*multiplier : 0;
    if(won) balance += payout;
    cardTitle.textContent = won ? 'CASHED OUT!' : 'DEFEAT';
    cardTitle.className = won ? 'win' : 'lose';
    cardSub.textContent = won
      ? 'You secured your winnings with '+rewardsFound+' rewards found.'
      : 'A monster caught Bomber Girl outside the Safe Point. Your bet was lost.';
    cardPayout.style.display = won ? 'block' : 'none';
    cardPayout.textContent = won ? '+🪙 '+payout.toFixed(2) : '';
    overlay.classList.add('show');
  }

  endBtn.addEventListener('click', ()=>{
    if(!gameActive){ startRound(); return; }
    if(phase!=='READY') return;
    endRound(true);
  });

  restartBtn.addEventListener('click', ()=>{
    overlay.classList.remove('show');
    if(monsterTimerId){ clearTimeout(monsterTimerId); monsterTimerId=null; }
    removeActor('monster');
    gameActive=false;
    startRound();
  });

  document.getElementById('betMinus').addEventListener('click', ()=>{
    if(gameActive) return;
    bet = Math.max(10, bet-10); refreshHud();
  });
  document.getElementById('betPlus').addEventListener('click', ()=>{
    if(gameActive) return;
    bet = Math.min(balance, bet+10); refreshHud();
  });

  boardEl.addEventListener('click', (e)=>{
    const cellDiv = e.target.closest('.cell');
    if(!cellDiv) return;
    const r = +cellDiv.dataset.r, c = +cellDiv.dataset.c;
    onCellClick(r,c);
  });

  boardEl.addEventListener('mousemove', (e)=>{
    if(phase!=='READY') return;
    const cellDiv = e.target.closest('.cell');
    clearPathPreview();
    if(!cellDiv) return;
    const r = +cellDiv.dataset.r, c = +cellDiv.dataset.c;
    if(isSelectableTile(r,c)){
      const path = astar(playerPos, {r,c});
      if(path){
        hoverPathCells = path;
        path.forEach(p=>cellEl(p.r,p.c).classList.add('path-preview'));
      }
    }
  });
  boardEl.addEventListener('mouseleave', clearPathPreview);
  function clearPathPreview(){
    hoverPathCells.forEach(p=>cellEl(p.r,p.c).classList.remove('path-preview'));
    hoverPathCells=[];
  }

  /* initial idle board (visual only, game not started) */
  generateBoard();
  render();
  refreshHud();
  setStatus('Tap "START" to begin your Risk Run · Select an empty tile to bomb nearby boxes once it begins','TAP TO START');

};
