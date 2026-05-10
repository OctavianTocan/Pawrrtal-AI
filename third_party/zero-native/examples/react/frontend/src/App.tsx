import { useEffect, useState } from "react";

export default function App() {
  const [bridge, setBridge] = useState("checking...");

  useEffect(() => {
    setBridge((window as any).zero ? "available" : "not enabled");
  }, []);

  return (
    <main>
      <p className="eyebrow">zero-native + React</p>
      <h1>React</h1>
      <p className="lede">A React frontend running inside the system WebView.</p>
      <div className="card">
        <span>Native bridge</span>
        <strong>{bridge}</strong>
      </div>
    </main>
  );
}
