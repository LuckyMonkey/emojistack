# EmojiStack

Tiny CSS-first emoji stacking with literal emoji classes, safe aliases, and prefab presets.

EmojiStack lets you render one emoji as a base, place another emoji on top of it, and control the overlay position with a small set of stack classes. The core renderer is CSS. The runtime stays small and focused on shorthand parsing and refresh hooks.

## Why This Exists

Sometimes the right icon is not a single icon. Sometimes it is a bottle with a strawberry on it, a laptop on fire, or a folder with a skull stamped onto it. EmojiStack exists for that very specific, slightly unreasonable, but actually useful case.

It is intentionally:

- small
- CSS-first
- framework-free
- light on JavaScript
- willing to expose literal emoji classes as public API

It is intentionally not:

- a giant icon framework
- a monorepo
- React-heavy
- a JavaScript-heavy icon framework

## Install

### Browser / local files

```html
<link rel="stylesheet" href="./dist/emojistack.css">
<link rel="stylesheet" href="./dist/emojistack-prefabs.css">
<script src="./dist/emojistack.js"></script>
```

### npm package

```bash
npm install emojistack
```

Then include the dist assets from your bundler or static pipeline.

## Quick Start

### Literal emoji mode

```html
<i class="es 🍼 🍓 s-center"></i>
<i class="es 📦 🍝 s-mc"></i>
<i class="es ☕ 💀 s-tl-ne"></i>
```

### Safe alias mode

```html
<i class="es e-bottle e-strawberry s-center"></i>
<i class="es e-box e-spaghetti s-mc"></i>
<i class="es e-coffee e-skull s-tl-ne"></i>
```

### Prefab mode

```html
<i class="es p-strawberry-milk"></i>
<i class="es p-fire-laptop"></i>
<i class="es p-warning-folder"></i>
```

## How It Works

The renderer is one element:

```html
<i class="es ..."></i>
```

The `.es` class uses pseudo-elements:

- `::before` renders the base emoji from `--es-base`
- `::after` renders the overlay emoji from `--es-sub`
- placement classes write `--es-x` and `--es-y`

Core variables:

- `--es-base`
- `--es-sub`
- `--es-x`
- `--es-y`
- `--es-sub-size`
- `--es-rotate`
- `--es-opacity`

## CSS-Only vs Optional Runtime

EmojiStack has two behavior layers.

### CSS-only

These work without JavaScript:

- prefab classes like `.p-strawberry-milk`
- direct CSS variable usage like `style="--es-base:'🍼'; --es-sub:'🍓'"`
- placement classes
- overlay size and rotation variables

### Optional runtime

These require `dist/emojistack.js`:

- literal emoji pair syntax like `.🍼 .🍓`
- alias pair syntax like `.e-bottle .e-strawberry`
- mixed pair syntax like `.🍼 .e-strawberry`

The runtime scans `.es`, reads class order, resolves the first emoji-like token as base, resolves the second as overlay, and writes the corresponding CSS variables inline. It also exposes `init()` and `refresh()` for dynamically inserted nodes.

## Placement Classes

EmojiStack ships exactly 46 placement classes.

### Direct center

- `s-center`

### Macro 3x3 grid

- `s-tl`
- `s-tc`
- `s-tr`
- `s-ml`
- `s-mc`
- `s-mr`
- `s-bl`
- `s-bc`
- `s-br`

### Micro positions

Each macro cell is split into four quadrants:

- `nw`
- `ne`
- `sw`
- `se`

Examples:

- `s-tl-nw`
- `s-tl-ne`
- `s-mc-sw`
- `s-br-se`

The sandbox includes a selector for all 46 positions, and the demo renders every one of them live.

## Alias System

Literal emoji classes are part of the public API. Aliases exist because some tooling, serializers, CSS pipelines, and formatters behave better with readable ASCII class names.

Examples:

- `.e-strawberry`
- `.e-bottle`
- `.e-box`
- `.e-skull`
- `.e-fire`
- `.e-laptop`

Alias classes map to the same emoji registry used by the runtime, the sandbox, and the prefab generator.

## Prefabs

EmojiStack ships with 68 starter prefabs across drinks, food, storage, cursed/funny, tech, and mood/symbol categories.

Examples:

- `p-strawberry-milk`
- `p-poison-bottle`
- `p-skull-coffee`
- `p-fire-laptop`
- `p-cable-box`
- `p-pasta-box`
- `p-doom-folder`
- `p-cat-angel`
- `p-brain-battery`
- `p-spicy-ramen`
- `p-toxic-jar`
- `p-cherry-soda`
- `p-archive-disk`
- `p-cursed-camera`
- `p-bomb-burger`
- `p-sparkle-phone`
- `p-warning-folder`
- `p-ghost-tv`
- `p-rat-bucket`
- `p-frog-crown`

Prefab classes are pure CSS. They set base, overlay, position, scale, opacity, and rotation variables directly.

## Sandbox Guide

Open [`sandbox/index.html`](./sandbox/index.html) or run `npm run dev` and visit `/sandbox/`.

The sandbox supports:

- base emoji picker
- overlay emoji picker
- all 46 placement classes
- click-to-place `1x1`, `3x3`, and `6x6` positioning boards
- overlay size slider
- very large preview size slider
- cursed, alias, and prefab mode previews
- copyable HTML snippets
- copyable prefab CSS
- starter prefab browser
- local prefab library
- localStorage persistence
- JSON export
- JSON import
- light/dark checkerboard preview backgrounds

Local prefabs are not magically bundled into `dist/emojistack-prefabs.css`. The sandbox gives you the CSS snippet you need so you can keep it in your own project stylesheet or add it back into the prefab source list.

## Prefab Creation Guide

You can create prefabs in two ways.

### In the sandbox

1. Pick base emoji, overlay emoji, position, and overlay size.
2. Enter a prefab name.
3. Save it locally.
4. Copy the generated CSS class.
5. Use it as `<i class="es p-your-name"></i>`.

### In source

Add an entry to [`data/prefabs.js`](./data/prefabs.js):

```js
{
  name: "my-stack",
  label: "My Stack",
  category: "custom",
  base: "bottle",
  overlay: "strawberry",
  position: "s-center",
  subSize: 0.58
}
```

Then regenerate:

```bash
npm run generate
```

## Extending The Emoji Registry

Add new entries to [`data/emojis.js`](./data/emojis.js):

```js
{ emoji: "🧪", alias: "test-tube", label: "Test Tube", category: "objects" }
```

Then regenerate:

```bash
npm run generate
```

This updates:

- [`src/emojis.generated.css`](./src/emojis.generated.css)
- [`src/aliases.generated.css`](./src/aliases.generated.css)
- [`src/registry.js`](./src/registry.js)

## Extending The Prefab Library

Add entries to [`data/prefabs.js`](./data/prefabs.js), then rebuild. The prefab generator validates base alias, overlay alias, and placement class before writing CSS.

Generated outputs:

- [`src/prefabs.css`](./src/prefabs.css)
- [`src/prefabs.generated.js`](./src/prefabs.generated.js)

## Demo

Open [`demo/index.html`](./demo/index.html) or run `npm run dev` and visit `/demo/`.

The demo includes:

- cursed literal emoji examples
- alias examples
- prefab examples
- large scroll-snap showcase panels with class text underneath
- incremental search with copy-ready snippet output
- all 46 placement classes
- size scaling examples
- platform caveat notes
- link to the sandbox

## Browser Compatibility

EmojiStack targets modern browsers that support:

- CSS custom properties
- pseudo-elements
- `classList`
- `querySelectorAll`

That means current Chrome, Edge, Firefox, and Safari should be fine.

## Emoji Rendering Caveats

Emoji artwork is not standardized at the glyph level. The same stack can look more compact, wider, or more vertically offset depending on:

- Apple emoji fonts
- Google / Noto emoji fonts
- Microsoft emoji fonts
- Linux desktop/browser combinations

EmojiStack controls layout, not vendor emoji design. Prefabs are tuned to look intentional, but some stacks will still feel different across platforms.

Literal emoji selectors are also more fragile when the class token uses multi-codepoint sequences or variation selectors. The safe alias system exists for exactly that reason.

## Development

```bash
npm run generate
npm run build
npm test
npm run dev
npm run preview
```

What each script does:

- `generate`: writes generated emoji, alias, registry, and prefab files
- `build`: runs generators and writes the dist bundles
- `test`: verifies counts, generated selectors, and runtime token resolution
- `dev`: builds and serves the repo locally on port `4173`
- `preview`: builds and serves the repo locally on port `4174`

## File Structure

```text
.
├── data
│   ├── emojis.js
│   ├── positions.js
│   └── prefabs.js
├── demo
│   ├── demo.css
│   ├── demo.js
│   └── index.html
├── dist
│   ├── emojistack-prefabs.css
│   ├── emojistack.css
│   ├── emojistack.js
│   └── emojistack.min.css
├── sandbox
│   ├── index.html
│   ├── sandbox.css
│   └── sandbox.js
├── scripts
│   ├── build.js
│   ├── generate-emojis.js
│   ├── generate-prefabs.js
│   ├── test.js
│   └── serve.js
├── src
│   ├── aliases.generated.css
│   ├── base.css
│   ├── emojis.generated.css
│   ├── positions.css
│   ├── prefabs.css
│   ├── prefabs.generated.js
│   ├── registry.js
│   └── runtime.js
├── .gitignore
├── index.html
├── LICENSE
├── package.json
└── README.md
```

## Distribution

The generated bundles live in [`dist`](./dist):

- [`dist/emojistack.css`](./dist/emojistack.css): core CSS, positions, literal emoji classes, alias classes
- [`dist/emojistack-prefabs.css`](./dist/emojistack-prefabs.css): starter prefab classes
- [`dist/emojistack.min.css`](./dist/emojistack.min.css): minified combined CSS
- [`dist/emojistack.js`](./dist/emojistack.js): registry data, prefab catalog, runtime enhancer

## Screenshots / GIFs

### Sandbox screenshot placeholder

Add a screenshot of the builder UI here.

### Demo screenshot placeholder

Add a screenshot of the demo gallery here.

### GIF placeholder

Add a short capture showing prefab creation, code copy, and live preview updates.

## Roadmap

- add more prefab packs without turning the library into a giant framework
- improve literal emoji selector notes for edge-case emoji sequences
- optionally ship a tiny watcher for generator-driven development
- add snapshot-style visual regression checks for prefab tuning

## Contributing

Contributions should keep the project small, CSS-first, and honest about tradeoffs. If a feature requires more runtime, it needs a good reason. If a feature can stay in CSS, keep it in CSS.

Preferred workflow:

1. Update `data/emojis.js` or `data/prefabs.js`.
2. Run `npm run generate`.
3. Run `npm run build`.
4. Verify the demo and sandbox.

## License

EmojiStack is released under the [MIT License](./LICENSE).
