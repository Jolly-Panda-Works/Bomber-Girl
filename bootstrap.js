(function(){
  'use strict';
  const splash = document.getElementById('splashScreen');
  const loadingEl = document.getElementById('splashLoading');
  const tapEl = document.getElementById('splashTap');
  let assetsReady = false;
  let started = false;

  function begin(){
    if(started || !assetsReady) return;
    started = true;
    window.startBomberGirl();
    splash.classList.add('hidden');
  }

  function readyToTap(){
    assetsReady = true;
    if(loadingEl) loadingEl.style.display = 'none';
    if(tapEl) tapEl.style.display = '';
  }

  window.loadBomberGirlAssets().then(readyToTap).catch(readyToTap);

  splash.addEventListener('click', begin);
  splash.addEventListener('touchend', function(e){ e.preventDefault(); begin(); }, {passive:false});
})();
