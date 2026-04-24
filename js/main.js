// js/main.js - 共用工具函數（可選）
export function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function wait(ms) { return new Promise(r => setTimeout(r, ms)); }