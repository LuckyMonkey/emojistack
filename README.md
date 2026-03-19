# EmojiStack

Tiny CSS-first emoji stacking with literal emoji classes, safe aliases, and prefab presets.

EmojiStack lets you render one emoji as a base, place another emoji on top of it, and control the overlay position with a small set of stack classes. The core renderer is CSS. The runtime stays small and focused on shorthand parsing and refresh hooks.

Live demo: https://luckymonkey.github.io/emojistack/

Third-party notice: Emoji names and group metadata are generated from [`unicode-emoji-json`](https://github.com/muan/unicode-emoji-json) by Mu-An Chiou. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

## Use On Your Site

EmojiStack is a normal frontend package, but you can also just copy the built files out of this repo and serve them yourself.

### npm

```bash
npm install emojistack
```

```js
import "emojistack/dist/emojistack.css";
import "emojistack/dist/emojistack-prefabs.css";
import "emojistack/dist/emojistack.js";
```

### Plain files from GitHub

1. Download or clone this repo.
2. Copy the files from [`dist`](./dist) into your own site.
3. Link them like any other static asset.

```html
<link rel="stylesheet" href="/assets/emojistack.css">
<link rel="stylesheet" href="/assets/emojistack-prefabs.css">
<script src="/assets/emojistack.js"></script>
```

Then paste the class string you built:

```html
<i class="es p-strawberry-milk"></i>
<i class="es 🍼🍓 s-44 es-s"></i>
```

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

## Quick Start

### Literal emoji mode

```html
<i class="es 🍼 🍓 s-44 es-s"></i>
<i class="es 📦 🍝 s-67 es-s"></i>
<i class="es ☕ 💀 s-17 es-s"></i>
```

### Safe alias mode

```html
<i class="es e-bottle e-strawberry s-44 es-s"></i>
<i class="es e-box e-spaghetti s-67 es-s"></i>
<i class="es e-coffee e-skull s-17 es-s"></i>
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

## What The Classes Do

EmojiStack stays small by making each class family do one job:

- `.es` creates the 1em icon box and the two pseudo-elements
- `.e-*` or literal emoji classes choose the base and top emoji
- `.p-*` loads a prefab with tuned offsets and size
- `.s-11` through `.s-77` place the top emoji on the 7x7 grid
- `.es-s`, `.es-m`, `.es-l` control top-emoji size

That means a custom stack is usually just:

```html
<i class="es 🍼🍓 s-44 es-s"></i>
```

and a prefab is:

```html
<i class="es p-strawberry-milk"></i>
```

## Placement Classes

EmojiStack now uses one 7x7 placement grid.

Each placement class is a lane coordinate:

- `s-11` through `s-77`
- `s-44` is the exact center
- rows and columns both have a real center lane now

Examples:

- `s-11`
- `s-17`
- `s-44`
- `s-55`
- `s-77`

Size is separate from placement:

- `.es-s`
- `.es-m`
- `.es-l`

Placement decides where the overlay lands. Size decides how large the overlay is inside that grid slot.

## Alias System

Literal emoji classes are part of the public API. Aliases exist because some tooling, serializers, CSS pipelines, and formatters behave better with readable ASCII class names.

Examples:

- `.e-strawberry`
- `.e-bottle`
- `.e-box`
- `.e-skull`
- `.e-fire`
- `.e-laptop`

Alias classes map to the same emoji registry used by the runtime and the prefab generator.

## Prefabs

EmojiStack ships with 80 starter prefabs across drinks, food, storage, cursed/funny, tech, and mood/symbol categories.

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

Prefab classes are pure CSS for the bundled starter set.

## Make Your Own Prefabs

Add an entry to [`data/prefabs.js`](./data/prefabs.js):

```js
{
  name: "my-stack",
  label: "My Stack",
  base: "bottle",
  overlay: "strawberry",
  position: "s-44",
  subSize: 0.32
}
```

Then regenerate:

```bash
npm run generate
```

## Extending The Emoji Registry

Add local alias or optical-offset overrides to [`data/emojis.js`](./data/emojis.js):

```js
{ emoji: "🧪", alias: "test-tube", ox: 0.01, oy: 0 }
```

Then regenerate:

```bash
npm run generate
```

This updates:

- [`src/emojis.generated.css`](./src/emojis.generated.css)
- [`src/aliases.generated.css`](./src/aliases.generated.css)
- [`src/registry.js`](./src/registry.js)

## Browser Compatibility

EmojiStack targets modern browsers that support:

- CSS custom properties
- pseudo-elements
- `classList`
- `querySelectorAll`

That means current Chrome, Edge, Firefox, and Safari should be fine.

## CSS Compatibility

EmojiStack is designed to sit next to other CSS systems without taking over the page.

- it only styles `.es` elements and its own utility classes
- it does not ship resets
- it does not target headings, links, buttons, forms, or layout primitives
- it uses CSS variables scoped to the icon element itself

For Tailwind and similar libraries:

- `e-*`, `p-*`, and `es-*` are safely namespaced
- the position classes are `s-11` through `s-77`
- the old generic `.sm`, `.md`, `.lg` aliases are not part of the public API, so they will not collide with other utility naming schemes

If another library styles `i` tags globally, apply EmojiStack on a neutral element or reset that rule for `.es`.

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

## Distribution

The generated bundles live in [`dist`](./dist):

- [`dist/emojistack.css`](./dist/emojistack.css): core CSS, positions, literal emoji classes, alias classes
- [`dist/emojistack-prefabs.css`](./dist/emojistack-prefabs.css): starter prefab classes
- [`dist/emojistack.min.css`](./dist/emojistack.min.css): minified combined CSS
- [`dist/emojistack.js`](./dist/emojistack.js): registry data and runtime enhancer

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
4. Verify the demo.

## License

EmojiStack is released under the [MIT License](./LICENSE).
