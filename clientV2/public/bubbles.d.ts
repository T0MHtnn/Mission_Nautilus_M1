/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * assembly/index/updateBubbles
 * @param bubbles `~lib/typedarray/Float32Array`
 * @param count `i32`
 * @param height `f32`
 */
export declare function updateBubbles(bubbles: Float32Array, count: number, height: number): void;
/**
 * assembly/index/initBubbles
 * @param bubbles `~lib/typedarray/Float32Array`
 * @param count `i32`
 * @param width `f32`
 * @param height `f32`
 * @param minR `f32`
 * @param maxR `f32`
 */
export declare function initBubbles(bubbles: Float32Array, count: number, width: number, height: number, minR: number, maxR: number): void;
