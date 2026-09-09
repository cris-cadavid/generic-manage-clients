"use client";
import { useEffect, useState } from "react";

function urlB64ToU8(s: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushButton({ orgId }: { orgId: string }) {
  const [state, setState] = useState<"idle" | "on" | "off" | "noapi">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator && "PushManager" in window)) { setState("noapi"); return; }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    }).catch(() => setState("noapi"));
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToU8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, subscription: sub.toJSON() }) });
    setState("on");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: (sub.toJSON() as { endpoint: string }).endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "idle") return null;
  if (state === "noapi") return <span className="text-xs text-zinc-400" title="Este navegador no soporta push">🔕 push no disponible</span>;
  return state === "on"
    ? <button onClick={disable} className="rounded border px-3 py-1.5 text-sm" title="Desactivar avisos en este dispositivo">🔔 Avisos activos</button>
    : <button onClick={enable} className="rounded bg-black px-3 py-1.5 text-sm text-white" title="Recibe aviso cuando haya reservas o recordatorios">🔕 Activar avisos</button>;
}
