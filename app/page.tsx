import { Experience } from "@/components/Experience";

export default function Page() {
  return (
    <>
      <Experience />
      <noscript>
        <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <p>NEURAL // 00 is an interactive WebGL experience and needs JavaScript enabled.</p>
        </div>
      </noscript>
    </>
  );
}
