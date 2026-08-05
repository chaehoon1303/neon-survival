(()=>{
  let orientationPlugin=null;
  async function lockLandscape(){
    try{
      if(window.Capacitor?.isNativePlatform?.()){
        orientationPlugin||=window.Capacitor.Plugins?.ScreenOrientation;
        if(orientationPlugin)await orientationPlugin.lock({orientation:'landscape'});
        return;
      }
      if(document.fullscreenElement&&screen.orientation?.lock)await screen.orientation.lock('landscape');
    }catch{}
  }
  lockLandscape();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)lockLandscape()});
  document.addEventListener('pointerdown',lockLandscape,{once:true});
})();
