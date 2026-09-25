import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaStatus() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const reloadForUpdate = useRef(false);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    if (Capacitor.isNativePlatform() || !import.meta.env.PROD || !("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("beforeinstallprompt", onInstallPrompt);
        window.removeEventListener("appinstalled", onInstalled);
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
      };
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installingWorker: ServiceWorker | null = null;
    const onControllerChange = () => {
      if (reloadForUpdate.current) window.location.reload();
    };
    const checkForWaiting = () => {
      if (!disposed && navigator.serviceWorker.controller && registration?.waiting) {
        setWaitingWorker(registration.waiting);
      }
    };
    const onInstallingStateChange = () => {
      if (installingWorker?.state === "installed") checkForWaiting();
    };
    const onUpdateFound = () => {
      installingWorker?.removeEventListener("statechange", onInstallingStateChange);
      installingWorker = registration?.installing ?? null;
      installingWorker?.addEventListener("statechange", onInstallingStateChange);
    };
    const checkForUpdate = () => { void registration?.update().catch(() => {}); };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" })
      .then((result) => {
        if (disposed) return;
        registration = result;
        registration.addEventListener("updatefound", onUpdateFound);
        checkForWaiting();
        checkForUpdate();
        window.addEventListener("online", checkForUpdate);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("online", checkForUpdate);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      registration?.removeEventListener("updatefound", onUpdateFound);
      installingWorker?.removeEventListener("statechange", onInstallingStateChange);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
    } finally {
      setInstallPrompt(null);
    }
  }

  function applyUpdate() {
    if (!waitingWorker) return;
    reloadForUpdate.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  if (!installPrompt && !waitingWorker && !isOffline) return null;

  return (
    <div className="expense-pwa-status" role="status">
      {isOffline && <span>آفلاین هستید؛ هزینه‌ها روی همین دستگاه در دسترس‌اند.</span>}
      {installPrompt && <button className="expense-button" type="button" onClick={installApp}>نصب برنامه</button>}
      {waitingWorker && <button className="expense-button" type="button" onClick={applyUpdate}>نسخهٔ تازه آماده است؛ به‌روزرسانی</button>}
    </div>
  );
}
