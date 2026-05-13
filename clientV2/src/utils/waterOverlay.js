export default function createWaterOverlay(map, userOptions = {}) {
  // Options par défaut
  const opts = {
    width: 500,
    height: 500,
    bubbleCount: 40,
    bubbleMinR: 6,
    bubbleMaxR: 14,
    ...userOptions
  };

  // Création du canvas et attaché au conteneur de la carte
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
  const ctx = canvas.getContext('2d');

  // Variables de rendu
  let width = 0, height = 0;
  let t = 0;
  const bubbles = [];

  function resize() {
    const size = map.getSize();
    width = size.x;
    height = size.y;
    canvas.width = width;
    canvas.height = height;
  }
  resize();
  window.addEventListener('resize', resize);

  // Créer bulles
  function spawnBubbles(n) {
    for (let i = 0; i < n; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: opts.bubbleMinR + Math.random() * (opts.bubbleMaxR - opts.bubbleMinR),
        alpha: 0.25 + Math.random() * 0.75,
        speed: 0.2 + Math.random() * 0.8
      });
    }
  }
  spawnBubbles(opts.bubbleCount);

  // Redessin
  function redraw() {
    ctx.clearRect(0, 0, width, height);

    /*scss*/
    // Fond bleu léger
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(0,120,170,0.25)');
    grad.addColorStop(1, 'rgba(0,60,100,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Ondulations simples
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) {
      const y = height / 2 + Math.sin((x + t * 2) * 0.02) * 20;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Bulles
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      b.y -= b.speed * 0.6;
      if (b.y < -10) b.y = height + 10;
      ctx.beginPath();
      const grd = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r);
      grd.addColorStop(0, `rgba(255,255,255,${b.alpha})`);
      grd.addColorStop(1, 'rgba(64,224,208,0)');
      ctx.fillStyle = grd;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    t += 0.5;

  }

  // Synchronisation avec les mouvements de la carte
  function alignCanvas() {
    // réadaptation éventuelle des bulles (ici on les laisse globales)
    // qui garantit juste que le canvas couvre la carte
  }

  map.on('zoom end', alignCanvas);
  map.on('moveend', alignCanvas);

  // Boucle d’animation
  let running = true;
  function loop() {
    if (!running) return;
    redraw();
    requestAnimationFrame(loop);
  }
  loop();

  // API simple
  return {
    stop() { running = false; },
    restart() { if (!running) { running = true; loop(); } },
    setBubbleCount(n) { /* optionnel: redéfinir le nombre et regénérer */ }
  };
}