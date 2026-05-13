let ctx = null;
let width = 0;
let height = 0;
let t = 0;
let bubbles = [];
let running = false;
let animFrameId = null;
let opts = {};

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

function redraw() {
    ctx.clearRect(0, 0, width, height);

    // Fond bleu
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(0,120,170,0.25)');
    grad.addColorStop(1, 'rgba(0,60,100,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Ondulations
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

function loop() {
    if (!running) return;
    redraw();
    animFrameId = requestAnimationFrame(loop);
}

self.onmessage = function (e) {
    const { type } = e.data;

    if (type === 'init') {
        ctx = e.data.canvas.getContext('2d');
        width = e.data.width;
        height = e.data.height;
        opts = e.data.opts;
        spawnBubbles(opts.bubbleCount);
        running = true;
        loop();
    }

    if (type === 'resize') {
        width = e.data.width;
        height = e.data.height;
        if (ctx) {
            ctx.canvas.width = width;
            ctx.canvas.height = height;
        }
    }

    if (type === 'stop') {
        running = false;
        if (animFrameId) cancelAnimationFrame(animFrameId);
    }

    if (type === 'restart') {
        if (!running) {
            running = true;
            loop();
        }
    }
}