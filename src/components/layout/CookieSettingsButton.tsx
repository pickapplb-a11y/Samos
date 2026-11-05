"use client";
export default function CookieSettingsButton() {
  return <button className="btn-ghost btn-sm" onClick={() => { localStorage.removeItem("vanta-consent"); window.dispatchEvent(new Event("vanta:cookie-settings")); }}>Change cookie settings</button>;
}
