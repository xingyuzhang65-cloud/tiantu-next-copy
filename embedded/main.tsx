import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import OverseasTransitPage from '../src/components/OverseasTransitPage';
import OverseasTransitOrderPage from '../src/components/OverseasTransitOrderPage';
import NotificationToast, { ToastMessage } from '../src/components/NotificationToast';
import './styles.css';

type OverseasView = 'storage' | 'transit';

const getInitialView = (): OverseasView => {
  const value = new URLSearchParams(window.location.search).get('view');
  return value === 'transit' ? 'transit' : 'storage';
};

function OverseasClientApp() {
  const [activeView, setActiveView] = useState<OverseasView>(getInitialView);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type']) => {
    setToasts((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        type,
      },
    ]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'tiantu-overseas-view') return;

      const nextView = event.data.view === 'transit' ? 'transit' : 'storage';
      setActiveView(nextView);
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'tiantu-overseas-ready' }, window.location.origin);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeView);
    window.history.replaceState(null, '', url);
    document.title = activeView === 'storage'
      ? '天图通达 - 海外暂存'
      : '天图通达 - 海外中转单';
  }, [activeView]);

  return (
    <div className="flex h-screen w-screen min-h-0 overflow-hidden bg-slate-100">
      {activeView === 'storage' ? (
        <OverseasTransitPage addToast={addToast} initialView="list" mode="storage" />
      ) : (
        <OverseasTransitOrderPage addToast={addToast} />
      )}
      <NotificationToast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<OverseasClientApp />);
