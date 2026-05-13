export default function createWaterOverlay(map, userOptions = {}) {
  const opts = {
    bubbleCount: 40,
    bubbleMinR: 6,
    bubbleMaxR: 14,
    ...userOptions
  };

  // Initialisation du canvas dans le DOM (thread principal)
  const container = map.getContainer();
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.left = 0;
  canvas.style.top = 0;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = 400;
  container.style.position = 'relative';
  container.appendChild(canvas);

  // Taille initiale
  const size = map.getSize();
  canvas.width = size.x;
  canvas.height = size.y;

  // Transfert du canvas au worker via OffscreenCanvas
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker(
    new URL('./waterWorker.js', import.meta.url),
    { type: 'module' }
  );

  // Envoyer l'OffscreenCanvas et les options au worker
  worker.postMessage({
    type: 'init',
    canvas: offscreen,
    width: size.x,
    height: size.y,
    opts
  }, [offscreen]); // transfert de propriété

  // Redimensionnement
  function resize() {
    const s = map.getSize();
    worker.postMessage({ type: 'resize', width: s.x, height: s.y });
  }
  window.addEventListener('resize', resize);
  map.on('moveend', resize);
  map.on('zoomend', resize);

  return {
    stop() { worker.postMessage({ type: 'stop' }); },
    restart() { worker.postMessage({ type: 'restart' }); },
    destroy() {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
      window.removeEventListener('resize', resize);
      canvas.remove();
    }
  };
}