'use client';
import * as React from 'react';

export default function FilterButton() {
  const open = React.useCallback(() => {
    window.dispatchEvent(new CustomEvent('filters:open'));
  }, []);
  return (
    <button className="btn btn-ghost" onClick={open} aria-label="Open filters">
      ▦ Filter
    </button>
  );
}
