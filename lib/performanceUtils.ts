export function mark(name: string, fn: () => void) {
try { performance.mark(name + "-start"); } catch {}
try { fn(); } finally {
try {
performance.mark(name + "-end");
performance.measure(name, name + "-start", name + "-end");
} catch {}
}
}