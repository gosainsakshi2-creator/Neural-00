# NEURAL // 00

An experimental interactive 3D visualization of artificial intelligence.

NEURAL // 00 is a standalone digital experience in the browser. There are no pages, sections or feature grids. You enter an AI operating environment, wake its core, and explore six systems that orbit it. Explore all six and the core responds.

---

## Concept

The whole experience is built around a single object: the **Neural Core**. It is a living structure of particles, synaptic links and orbital rings. Six systems sit around it as physical nodes in 3D space:

| Node | System     | What you see                                                                  |
| ---- | ---------- | ----------------------------------------------------------------------------- |
| 01   | Memory     | Particles gather into clusters joined by streaming associations; recalls flash |
| 02   | Vision     | A LiDAR-like point cloud, a scan plane sweeping upward, objects being detected |
| 03   | Reasoning  | A branching graph that fires layer by layer: input → context → reasoning → decision → output |
| 04   | Voice      | A 3D waveform and a simulated exchange (no microphone, no audio input)         |
| 05   | Agents     | Four agents passing packets of work through an orchestrator; select one to wake it |
| 06   | Generation | Latent noise resolving into a knot, a word, a branching pattern and nested solids |

Every system is the **same particle field** morphing into a new formation, so moving between them feels like one organism reorganising itself rather than a page changing.

There is also a hidden ending, which this README leaves for you to find.

## Interaction

| Input                     | Action                                       |
| ------------------------- | -------------------------------------------- |
| Drag                      | Orbit the environment                        |
| Scroll / pinch            | Zoom                                         |
| Hover a node              | Brighten it and its connection               |
| Click / tap a node        | Fly into that system                         |
| Move the pointer          | Particles part around it; links quicken      |
| `1`–`6`                   | Open a system                                |
| `Esc`                     | Return to the core                           |
| `O`                       | Toggle the Observer (diagnostic layer)       |

The floating controls are **Core**, **Observe**, **System** (render quality, motion, sound, shortcuts), **Reset** and **Sound** (off by default).

**Observer** switches the scene into a technical view with a polar measurement grid, crisper particles and a diagnostics panel. All of its figures are demonstration values. They are labelled as simulated in the interface and are not measurements of anything.

## Technology

- **Next.js 16** (App Router, Turbopack) and **React 19**, with strict **TypeScript**
- **Three.js**, **React Three Fiber** and **@react-three/drei**
- **@react-three/postprocessing**: bloom, film grain and vignette on capable devices
- **Tailwind CSS 4**, **Motion** and **Lucide React**
- **Zustand** for experience state
- Fonts bundled locally via Fontsource: Archivo (variable width) and Martian Mono

There is no backend, no API, no authentication and no tracking. It is purely a frontend experience.

## Architecture

```
app/
  layout.tsx              metadata, Open Graph, viewport, fonts
  page.tsx                renders <Experience />
  opengraph-image.tsx     generated share image
  icon.svg                favicon
  globals.css             design tokens and component styles
components/
  Experience.tsx          root: wires hooks, lazy-loads the WebGL scene, layers the UI
  hooks/                  behaviour without markup
    useSceneDirector      maps the open system to a particle formation
    useFinaleDirector     the hidden ending's timeline
    useGenerationCycle    prompt → latent space → transformation → output loop
    useVoiceCycle         simulated conversation timing
    useEnvironment        device tier, touch, reduced-motion detection
    usePointer, useKeyboard, useSound
  scene/                  everything inside the <Canvas>
    Scene.tsx             canvas, adaptive DPR, Suspense boundary
    ParticleField.tsx     GPU morphing particle system (the heart of the piece)
    CameraRig.tsx         custom cinematic camera: presets, orbit, zoom, parallax
    SystemNodes.tsx       the six interactive nodes
    NeuralLinks.tsx       synaptic web with travelling pulses
    overlays/             per-system 3D layers (memory, vision, reasoning, voice, agents)
    Anchor.tsx            3D → screen projection for DOM labels
    primitives.tsx        reusable pulse lines, glow points, fades
  ui/                     DOM interface (HUD, intro, panels, labels, finale, cursor)
lib/
  shapes.ts               target positions for every particle formation
  layouts.ts              deterministic positions shared by shapes and overlays
  store.ts                Zustand store
  systems.ts, palette.ts, quality.ts, fx.ts, anchors.ts, sound.ts
```

### How the particle morph works

Each particle carries two positions on the GPU: where it is coming from (`position`) and where it is going (`aTarget`). A single uniform drives progress from 0 to 1, and the vertex shader eases each particle with its own stagger and an arcing swirl. When a new formation is requested mid-transition, the current blended state is recomputed on the CPU using the same easing, so interrupted morphs continue smoothly instead of jumping.

Pointer influence is computed in screen space inside the shader. The cursor therefore parts the cloud by the same amount from any camera angle.

### Labels

Floating labels live in one ordinary DOM layer. Scene components register invisible anchors, and a single projector writes each label's screen position once per frame. This avoids creating a separate React root for every label.

## Performance

- **Device-aware tiers**, chosen automatically and switchable in **System**:

  | Tier   | Particles | Bloom | Max DPR |
  | ------ | --------- | ----- | ------- |
  | High   | 20,000    | yes   | 1.75    |
  | Medium | 11,000    | yes   | 1.5     |
  | Low    | 5,200     | no    | 1.25    |

- **Adaptive resolution**: drei's `PerformanceMonitor` lowers the device pixel ratio if frame rate drops.
- **One draw call** for the main particle field. All animation runs in shaders, and per-frame CPU work is limited to uniform updates.
- **Allocation-free frame loops**. Geometries and materials are created once, reused and disposed on unmount.
- **Lazy loading**: the WebGL scene is loaded client-side with `next/dynamic` inside a `Suspense` boundary, so the first paint is type on black.
- **Frame delta is clamped**, so returning to a backgrounded tab never causes a jump.

### Reduced motion

If `prefers-reduced-motion` is set, the experience stays complete and interactive, but gentler:

- The intro skips straight to ready.
- Transitions are shorter and drop the swirl.
- Idle drift, parallax and grain are off.
- The finale runs faster without the flash.

### Mobile

On mobile the experience is reworked rather than shrunk:

- Lower particle density.
- The node ring is drawn tighter for portrait screens.
- A 3×2 system grid keeps every system one tap away.
- Bottom-sheet panels, with the camera lifting the subject above them.
- Larger touch targets.
- No custom cursor.

## Local setup

Requires **Node.js 20.9+**.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint (Next.js core-web-vitals + TypeScript)
npm run typecheck  # tsc --noEmit
```

## Deployment

The app is fully static, so it deploys anywhere that runs Next.js.

**Vercel:** import the repository and deploy. No configuration is needed.

**Other hosts:** run `npm run build` and `npm run start`, or deploy with any Next.js-compatible adapter.

Set `NEXT_PUBLIC_SITE_URL` to your production URL so Open Graph images resolve to absolute links:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Notes

- Sound is synthesised in the browser with the Web Audio API. It is off by default, loads no files, and never requests microphone access.
- The voice system is a visual simulation only.
- Observer metrics are demonstration values.

## License

MIT
