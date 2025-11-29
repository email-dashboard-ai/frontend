import { useState, useCallback, useEffect } from 'react';

export const useResizableLayout = () => {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [listWidth, setListWidth] = useState(350);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingList, setIsResizingList] = useState(false);

  const startResizingSidebar = useCallback(() => setIsResizingSidebar(true), []);
  const startResizingList = useCallback(() => setIsResizingList(true), []);

  const stopResizing = useCallback(() => {
    setIsResizingSidebar(false);
    setIsResizingList(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizingSidebar) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 150 && newWidth < 400) {
        setSidebarWidth(newWidth);
      }
    }
    if (isResizingList) {
      const newWidth = mouseMoveEvent.clientX - sidebarWidth;
      if (newWidth > 300 && newWidth < 800) {
        setListWidth(newWidth);
      }
    }
  }, [isResizingSidebar, isResizingList, sidebarWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return {
    sidebarWidth,
    listWidth,
    startResizingSidebar,
    startResizingList
  };
};
