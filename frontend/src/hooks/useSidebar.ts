import { useState } from "react";

export default function useSidebar(moduleKey) {
  const storageKey = `${moduleKey}_sidebar_expanded`;

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const newVal = !prev;
      localStorage.setItem(storageKey, JSON.stringify(newVal));
      return newVal;
    });
  };

  return [sidebarExpanded, toggleSidebar];
}
