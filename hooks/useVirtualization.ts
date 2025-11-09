"use client";
import { useEffect, useRef, useState } from "react";


export function useVirtualization({ count, rowHeight }: { count: number; rowHeight: number }) {
const containerRef = useRef<HTMLDivElement | null>(null);
const [viewportH, setViewportH] = useState(300);
const [scrollTop, setScrollTop] = useState(0);


useEffect(() => {
const el = containerRef.current; if (!el) return;
const onScroll = () => setScrollTop(el.scrollTop);
const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
el.addEventListener("scroll", onScroll);
ro.observe(el);
return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); };
}, []);


const visibleCount = Math.ceil(viewportH / rowHeight) + 6;
const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 3);
const end = Math.min(count, start + visibleCount);
const offsetY = start * rowHeight;


return { containerRef, start, end, offsetY, viewportH };
}