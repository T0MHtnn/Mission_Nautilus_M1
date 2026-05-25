// Calcul des positions des bulles en WASM

// Tableau de bulles : x, y, r, alpha, speed (5 valeurs par bulle)
const BUBBLE_SIZE: i32 = 5;

export function updateBubbles(
  bubbles: Float32Array,
  count: i32,
  height: f32
): void {
  for (let i: i32 = 0; i < count; i++) {
    const base: i32 = i * BUBBLE_SIZE;
    // y -= speed * 0.6
    bubbles[base + 1] -= bubbles[base + 4] * 0.6;
    // Si la bulle sort par le haut, elle réapparaît en bas
    if (bubbles[base + 1] < -10) {
      bubbles[base + 1] = height + 10;
    }
  }
}

export function initBubbles(
  bubbles: Float32Array,
  count: i32,
  width: f32,
  height: f32,
  minR: f32,
  maxR: f32
): void {
  for (let i: i32 = 0; i < count; i++) {
    const base: i32 = i * BUBBLE_SIZE;
    bubbles[base + 0] = Math.random() as f32 * width;        // x
    bubbles[base + 1] = Math.random() as f32 * height;       // y
    bubbles[base + 2] = minR + (Math.random() as f32) * (maxR - minR); // r
    bubbles[base + 3] = 0.25 + (Math.random() as f32) * 0.75; // alpha
    bubbles[base + 4] = 0.2 + (Math.random() as f32) * 0.8;  // speed
  }
}