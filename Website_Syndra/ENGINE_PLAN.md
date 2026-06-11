# Obsidian Custom Web Engine — Architecture Plan

## Reference Websites

### Three.js Award-Winning Sites
| Site | Studio | Key Techniques |
|------|--------|---------------|
| [The Blue Desert](https://orpetron.com/sites/the-blue-desert/) | Adoratorio | 3D landscape, narrative scroll, WebGL terrain |
| [Lacoste Members Experience](https://orpetron.com/sites/lacoste-members-experience/) | Merci-Michel | 3D product configurator, real-time |
| [Quatre 20th Anniversary](https://orpetron.com/sites/quatre-20th-anniversary/) | Merci-Michel | Mini-games, 3D ring rendering |
| [Bruno Simon](https://bruno-simon.com) | Solo | Driveable vehicle in 3D scene, scroll control |
| [samsy.ninja](https://samsy.ninja) | Samuel Honigstein | WebGPU cyberpunk city, 120+ FPS, first-person |
| [bilal.show](https://bilal.show) | Bilal El Moussaoui | Scroll-driven 3D story, character animation |
| [Son Daven](https://sondaven.com/en) | Webflow + GSAP | Lenis smooth scroll, SplitText, horizontal pin scroll, frame-by-frame video |

### GSAP Award-Winning Sites
| Site | Studio | Key Techniques |
|------|--------|---------------|
| [Ion X1 (Lusion)](https://orpetron.com/sites/ion-x1/) | Lusion | Immersive 3D + GSAP scroll, interactive |
| [Beauty in STEM](https://beautyinstem.com) | Olha Lazarieva | Scroll-triggered reveals |
| [REF Digital](https://ref.digital) | REF Digital | Refined scroll animations, transitions |
| [Vaulk](https://vaulk.com) | LEOLEO | Custom cursor, scroll narrative |

### Spline/3D Award-Winning Sites
| Site | Creator | Key Techniques |
|------|---------|---------------|
| [Loop Music Recorder](https://loop-music.webflow.io) | Andrew Ehrensperger | Spline 3D asset + scroll interaction |
| [Iridescent AI](https://iridescent-ai.webflow.io) | Diego Toda | Wild scrolling, abstract 3D scenes |
| [Avora AI](https://ai-avora.webflow.io) | Andrew Ehrensperger | Blender-to-Spline jet model, radar pulse |
| [Neocultural Couture](https://www.neoculturalcouture.com) | Jordan Gilroy | Glass effects, fixed 3D central element |
| [Immersive Garden](https://immersive-g.com) | Immersive Garden | Agency of the Year 2025, 3D + design |

### CSS Animation Award-Winning Sites
| Site | Studio | Key Techniques |
|------|--------|---------------|
| [Terminal Industries](https://www.terminal-industries.com) | REJOUICE | Awwwards SOTM Sep 2025, minimal + animation |
| [Lando Norris](https://landonorris.com) | OFF+BRAND | Site of the Year 2025, CSS + WebGL |
| [Apechain](https://apechain.com) | makemepulse | Developer Award, SOTD 2026 |
| [Steven.com](https://steven.com) | OFF+BRAND | Developer Award, SOTD |

### Key Inspirations (User-Requested)
| Site | Key Techniques |
|------|---------------|
| [Brunello Cucinelli AI](https://shop.brunellocucinelli.com/en-gb/ai) | Vue SPA, scroll-snap story, AI prompt, luxury aesthetic, CSS transitions, video backgrounds, footer/prompt always fixed |
| [Noomo Agency Storytelling](https://storytelling.noomoagency.com) | Three.js + GSAP + Vue, 20-section scroll narrative, 3D ice crystals, character-split text, custom cursor with glass effect, preloader, sound toggle |

---

## Engine Architecture

```
Obsidian Engine (single closure, V8-snapshot ready)
│
├── Core
│   ├── EventEmitter
│   ├── Pool (object pooling)
│   ├── Math (Vec2, Vec3, Mat4, Quat, Ray, Plane)
│   └── Clock (delta, elapsed, frame count)
│
├── Renderer
│   ├── WebGL2Context (wrapper, state cache, extension manager)
│   ├── SceneGraph (Node → Mesh, Light, Camera, Group)
│   ├── Transform (position, rotation, scale, matrix, world matrix)
│   ├── Camera (Perspective, Orthographic)
│   ├── Mesh (geometry + material)
│   ├── Geometry (BufferGeometry: positions, normals, uvs, indices)
│   ├── Material (PBR, Unlit, Standard, CustomShader)
│   ├── Lights (Ambient, Directional, Point, Spot)
│   ├── ShadowMap (PCF soft shadows)
│   ├── PostProcessing (bloom, vignette, color grade, DOF)
│   └── ShaderChunks (precompiled GLSL)
│
├── Animation
│   ├── Tween (value → target, duration, easing)
│   ├── Timeline (sequence of tweens, parallel/chain)
│   ├── Easing (linear, quad, cubic, quart, quint, expo, elastic, bounce, spring)
│   ├── ScrollController (section tracking, progress, snap)
│   ├── Spring (physics-based animation)
│   └── Stagger (offset-based group animation)
│
├── Interaction
│   ├── InputManager (mouse, touch, keyboard, gamepad)
│   ├── Raycaster (mouse → 3D intersection)
│   ├── DragController (3D object dragging)
│   └── HoverController (enter/leave events on 3D objects)
│
├── Scene
│   ├── SceneLoader (custom .obd binary format parser)
│   ├── SceneManager (scene transitions, loading states)
│   └── Environment (skybox, fog, ambient)
│
├── Effects
│   ├── ParticleSystem (CPU + GPU particles)
│   ├── GlowPass (bloom)
│   ├── TransitionPass (scene transitions)
│   └── NoiseOverlay (film grain)
│
└── Util
    ├── AABB (axis-aligned bounding box)
    ├── Octree (spatial partitioning)
    └── BinaryParser (custom format decoder)
```

---

## V8 Snapshot Strategy

### Goal: <0.2ms initialization

The entire engine must be structured as a **single deterministic closure** with **zero top-level side effects**:

```js
// BAD - creates objects at parse time
const scene = new Scene();
const renderer = new Renderer();

// GOOD - lazy initialization
const Obsidian = (() => {
  let instance = null;
  function init(canvas) {
    if (instance) return instance;
    // all allocations happen here
    instance = { renderer: new Renderer(canvas), scene: new Scene() };
    return instance;
  }
  return { init };
})();
```

### Requirements for snapshotability:
1. No top-level `new` expressions
2. No top-level function calls
3. All modules wrapped in a single IIFE
4. All strings interned at build time
5. All class prototypes fully defined before any instantiation
6. Deterministic initialization order
7. No `Proxy`, `Symbol`, `WeakMap`/`WeakSet` in hot paths
8. All arrays pre-allocated with fixed sizes where possible

---

## Implementation Phases

### Phase 1: Math + Core (Foundation)
- Vec2, Vec3, Vec4
- Mat4 (affine transforms)
- Quaternion
- Ray + Plane
- AABB (axis-aligned bounding box)
- Color (RGBA, hex, lerp)
- EventEmitter
- Clock (delta time, FPS)
- ObjectPool (reusable object recycling)

### Phase 2: WebGL2 Renderer
- WebGL2Context wrapper (state caching, error handling, extension detection)
- Shader compilation + program linking
- Buffer management (VBO, IBO, VAO)
- Texture (2D, cube, HDR, mipmaps)
- Framebuffer + Renderbuffer
- Default PBR shader pipeline
- Transforms → matrix stack → world matrices

### Phase 3: Scene Graph
- Node (parent, children, transform, enabled)
- Mesh (geometry + material references)
- Camera (projection, view matrix, frustum culling)
- Light components (ambient, directional, point, spot)
- Group (transformed container)
- Scene (root node, clear color, environment)

### Phase 4: Materials + Shading
- Material base class
- PBRMaterial (albedo, metalness, roughness, normal, AO, emissive)
- UnlitMaterial (solid color, texture)
- CustomShaderMaterial (user-provided vertex/fragment)
- Shader chunk system (modular GLSL includes)
- Uniform buffer for scene data (camera, lights, time)

### Phase 5: Animation Engine
- Tween class (single property animation)
- Easing functions (30+ easing curves)
- Timeline (sequential + parallel tracks)
- ScrollController (IntersectionObserver + scroll progress)
- Spring physics (mass, stiffness, damping)
- Stagger (offset children, grid, radial)
- FLIP animation helper (First, Last, Invert, Play)

### Phase 6: Interaction
- InputManager (mouse position, buttons, wheel, touch, keyboard, gamepad)
- Raycaster (screen → world → object intersection)
- DragController (3D object manipulation)
- HoverController (enter/leave on 3D mesh)
- ClickController (tap/click detection on 3D objects)

### Phase 7: Post-Processing
- PostProcessPass base class
- BloomPass (gaussian blur + threshold)
- VignettePass
- ColorGradePass (contrast, saturation, exposure)
- FXAAPass (anti-aliasing)
- TransitionPass (scene fade/crossfade)

### Phase 8: Scene Composition + Effects
- ParticleSystem (CPU: position, velocity, life; GPU: instanced)
- Skybox (cube map)
- Fog (linear, exponential)
- Scene transitions (morph, fade, slide)
- Noise overlay (film grain, static)

### Phase 9: Asset Pipeline
- Custom `.obd` binary format (header → vertex data → index data → material → hierarchy)
- OBJ/glTF → .obd converter (Node.js script)
- Texture compressor (basis/KTX2 wrapper)
- SceneLoader (streaming + progress)

### Phase 10: Integration into Obsidian Website
- Replace current inline engine with Obsidian Engine
- Hero section with 3D particle galaxy
- 3D model showcase (interactive)
- Scroll-driven narrative sections
- Theme-aware PBR materials
- Performance monitoring (FPS, draw calls, memory)

---

## Easing Functions (30+)
linear, quadIn, quadOut, quadInOut, cubicIn, cubicOut, cubicInOut, quartIn, quartOut, quartInOut, quintIn, quintOut, quintInOut, expoIn, expoOut, expoInOut, sineIn, sineOut, sineInOut, circIn, circOut, circInOut, elasticIn, elasticOut, elasticInOut, backIn, backOut, backInOut, bounceIn, bounceOut, bounceInOut, spring

---

## WebGL2 Feature Requirements
- `EXT_color_buffer_float` (HDR rendering)
- `WEBGL_compressed_texture_s3tc` / `WEBGL_compressed_texture_etc` (compressed textures)
- `EXT_texture_filter_anisotropic` (anisotropic filtering)
- `WEBGL_depth_texture` (shadow maps)
- `OES_texture_float_linear` (float texture filtering)

---

## Performance Budget
- <0.2ms engine initialization (V8 snapshot)
- <2MB total JS (gzipped)
- 60fps on mid-range mobile
- <50 WebGL draw calls
- <1000 particles (CPU) / <10000 particles (GPU instanced)
- <100 meshes in scene
