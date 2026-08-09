/* Presentation-only game UI layer: adds responsive depth, tilt, and brief panel arrival cues. */
(()=>{
  const tiltSelector='.facility-card,.base-project,.mode-card,.quest-card,.item,.battle-info-card,.arsenal-crate-card,.upgrade-card,.character-card';
  const canHover=matchMedia('(hover:hover) and (pointer:fine)');
  function clearTilt(node){node.style.removeProperty('--ui-tilt-x');node.style.removeProperty('--ui-tilt-y')}
  function addTilt(node){if(node.dataset.uiTilt)return;node.dataset.uiTilt='1';node.addEventListener('pointermove',event=>{if(!canHover.matches)return;const rect=node.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;node.style.setProperty('--ui-tilt-x',`${(-y*1.6).toFixed(2)}deg`);node.style.setProperty('--ui-tilt-y',`${(x*1.8).toFixed(2)}deg`)});node.addEventListener('pointerleave',()=>clearTilt(node));node.addEventListener('pointercancel',()=>clearTilt(node))}
  function decorate(root=document){root.querySelectorAll(tiltSelector).forEach(addTilt);root.querySelectorAll('.screen:not(.hidden),.panel:not(.hidden)').forEach(panel=>{if(!panel.dataset.uiVisible){panel.dataset.uiVisible='1';panel.classList.add('ui-enter');setTimeout(()=>panel.classList.remove('ui-enter'),380)}})}
  const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='attributes'||record.addedNodes.length)decorate(document)}});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('pointerdown',event=>{const card=event.target.closest?.(tiltSelector);if(card)card.classList.add('ui-pressed')});
  document.addEventListener('pointerup',event=>event.target.closest?.(tiltSelector)?.classList.remove('ui-pressed'));
  document.addEventListener('pointercancel',event=>event.target.closest?.(tiltSelector)?.classList.remove('ui-pressed'));
  decorate();
})();
