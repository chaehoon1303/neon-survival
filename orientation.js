(()=>{
  let orientationPlugin=null;
  const isPhoneOrTablet=()=>window.Capacitor?.isNativePlatform?.()||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const nativePlatform=window.Capacitor?.getPlatform?.()||'web';
  // 데스크톱 창이 세로로 길어져도 회전 안내를 띄우지 않는다.
  document.documentElement.classList.toggle('mobile-viewport',isPhoneOrTablet());
  document.documentElement.classList.toggle('native-mobile',nativePlatform==='ios'||nativePlatform==='android');
  document.documentElement.classList.toggle('native-ios',nativePlatform==='ios');
  document.documentElement.classList.toggle('native-android',nativePlatform==='android');
  async function lockLandscape(){
    try{
      if(window.Capacitor?.isNativePlatform?.()){
        orientationPlugin||=window.Capacitor.Plugins?.ScreenOrientation||window.Capacitor.registerPlugin?.('ScreenOrientation');
        if(orientationPlugin)await orientationPlugin.lock({orientation:'landscape'});
        return;
      }
      if(document.fullscreenElement&&screen.orientation?.lock)await screen.orientation.lock('landscape');
    }catch{}
  }
  lockLandscape();
  // iOS WebView는 시작 직후 플러그인 브리지가 준비되는 시점이 조금 늦을 수 있다.
  // 짧게 재시도하고 앱이 다시 전면에 올 때도 잠금을 복구한다.
  [180,700,1500].forEach(delay=>setTimeout(lockLandscape,delay));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)lockLandscape()});
  document.addEventListener('resume',lockLandscape);
  addEventListener('orientationchange',lockLandscape);
  document.addEventListener('pointerdown',lockLandscape,{once:true});
})();
