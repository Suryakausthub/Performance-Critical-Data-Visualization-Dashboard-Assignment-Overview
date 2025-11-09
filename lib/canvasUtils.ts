import { Scale, Viewport } from "./types";


export function drawAxes(ctx: CanvasRenderingContext2D, scale: Scale, vp: Viewport) {
ctx.save();
ctx.strokeStyle = "#334155";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(vp.x, vp.y + vp.h); ctx.lineTo(vp.x + vp.w, vp.y + vp.h);
ctx.moveTo(vp.x, vp.y); ctx.lineTo(vp.x, vp.y + vp.h);
ctx.stroke();
ctx.restore();
}


export function drawLine(ctx: CanvasRenderingContext2D, scale: Scale, vp: Viewport, pts: {x:number;y:number}[]) {
drawAxes(ctx, scale, vp);
if (pts.length === 0) return;
ctx.save();
ctx.beginPath();
for (let i = 0; i < pts.length; i++) {
const p = pts[i];
const x = scale.x(p.x), y = scale.y(p.y);
if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
}
ctx.lineWidth = 1.5; ctx.strokeStyle = "#60a5fa"; ctx.stroke();
ctx.restore();
}


export function drawBars(ctx: CanvasRenderingContext2D, scale: Scale, vp: Viewport, pts: {x:number;y:number}[]) {
drawAxes(ctx, scale, vp);
if (pts.length === 0) return;
ctx.save();
const w = Math.max(1, Math.floor(vp.w / Math.max(pts.length, 1)) - 1);
ctx.fillStyle = "#34d399";
for (let i = 0; i < pts.length; i++) {
const p = pts[i];
const x = scale.x(p.x) - w / 2;
const y = scale.y(p.y);
const h = vp.y + vp.h - y;
ctx.fillRect(x, y, w, h);
}
ctx.restore();
}


export function drawScatter(ctx: CanvasRenderingContext2D, scale: Scale, vp: Viewport, pts: {x:number;y:number}[]) {
drawAxes(ctx, scale, vp);
if (pts.length === 0) return;
ctx.save();
ctx.fillStyle = "#f472b6";
const r = 1.5;
for (let i = 0; i < pts.length; i++) {
const p = pts[i];
const x = scale.x(p.x), y = scale.y(p.y);
ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
ctx.restore();
}


export function drawHeatmap(ctx: CanvasRenderingContext2D, scale: Scale, vp: Viewport, pts: {x:number;y:number}[]) {
drawAxes(ctx, scale, vp);
if (pts.length === 0) return;
ctx.save();
// simple grid binning (LOD)
const cols = 64, rows = 32;
const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
let xMin = pts[0].x, xMax = pts[0].x, yMin = pts[0].y, yMax = pts[0].y;
for (const p of pts) {
if (p.x < xMin) xMin = p.x;
if (p.x > xMax) xMax = p.x;
if (p.y < yMin) yMin = p.y;
if (p.y > yMax) yMax = p.y;
}
const xRange = Math.max(1, xMax - xMin);
const yRange = Math.max(1, yMax - yMin);
for (const p of pts) {
const cx = Math.min(cols - 1, Math.max(0, Math.floor(((p.x - xMin) / xRange) * cols)));
const cy = Math.min(rows - 1, Math.max(0, Math.floor(((p.y - yMin) / yRange) * rows)));
grid[rows - 1 - cy][cx] += 1;
}
const max = grid.reduce((m,row)=>Math.max(m, ...row), 0) || 1;
const cellW = vp.w / cols;
const cellH = vp.h / rows;
for (let r = 0; r < rows; r++) {
for (let c = 0; c < cols; c++) {
const weight = grid[r][c] / max;
if (weight <= 0) continue;
const hue = 210 - weight * 180;
const alpha = 0.2 + weight * 0.7;
ctx.fillStyle = `hsla(${hue}, 85%, 55%, ${alpha.toFixed(3)})`;
ctx.fillRect(vp.x + c * cellW, vp.y + r * cellH, cellW + 1, cellH + 1);
}
}
ctx.restore();
}
