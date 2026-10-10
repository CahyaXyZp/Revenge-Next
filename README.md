# Next Plugins

My Revenge Next plugins. This is the `next-plugins` branch of
[CahyaXyZp/Revenge-Next](https://github.com/CahyaXyZp/Revenge-Next).

## Branches

| Branch | What it holds |
| --- | --- |
| `main` | the Revenge bundle workflow (`update-bundle.yml`). It deploys the bundle **and** the plugin repository to GitHub Pages. |
| `next-plugins` | the plugin sources and the build workflow. This branch. |
| `plugin-dist` | built plugin zips and `index.json`. Written by the build workflow, never edit it by hand. Copied into the Pages site by `update-bundle.yml`. |

## Install the plugins

In Revenge Next, open **Settings → Plugins → Advanced**, add this repository URL (without `index.json`), then press **+** to
browse and install:

```
https://cahyaxyzp.github.io/Revenge-Next
```

## Plugins

### Server Tweaks

Small quality-of-life tweaks for servers and channels.

- **Copy Channel Name**: adds a button to the channel long-press menu (text, voice, announcement
  channels, threads and forum posts) that copies the channel name.

## How publishing works

- A push to `next-plugins` that touches `plugins/` runs `build-plugins.yml`. It bundles every
  plugin, zips each one as `<id>@<version>.zip`, adds new versions to `pool/` on the `plugin-dist`
  branch and regenerates `index.json` from everything in the pool.
- A version that is already on `plugin-dist` is never overwritten. **To release a change, raise
  `version` in the plugin's `manifest.json`.** Revenge also only offers an update when the version
  is higher than the one installed.
- Pull requests build the plugins without publishing, and attach the result to the run as the
  `plugin-repository` artifact.
- After publishing, the workflow starts `update-bundle.yml` on `main`. That workflow copies
  `plugin-dist` into the same Pages site as `revenge.bundle`, so both are always deployed together.
  It also redeploys when `plugin-dist` has a new commit, even if the bundle did not change.
- GitHub Pages can take a minute or two to show a new release.

## Layout

```
plugins/
└── server-tweaks/
    ├── manifest.json
    └── js/
        ├── index.ts                      plugin entry
        ├── patches/actionsheet.ts        hooks Discord's long-press menus
        └── features/copy-channel-name.tsx
.github/
├── scripts/build-plugins.sh              build + zip + index for one run
├── scripts/publish-plugin-branch.sh      adds new zips to plugin-dist
└── workflows/build-plugins.yml
```

## Adding a plugin

Create `plugins/<name>/manifest.json` and `plugins/<name>/js/index.ts`. Give it its own `id`
(for example `cahyaxyzp.<name>`), copy the `dependencies` and `dist` blocks from an existing
manifest, and `export default plugin({ ... })`. Only JS-only plugins are supported by the build
script. Every plugin under `plugins/` is built and listed in the same repository automatically.

## Adding a feature to Server Tweaks

Create `js/features/<name>.tsx` that exports a `register...(cleanup)` function and call it from
`js/index.ts`. To add a row to a long-press menu, call
`registerActionSheetPatch(key, (groups, props) => { ... })` as `copy-channel-name.tsx` does.

## Build locally

```sh
bun install
bun --bun run build
bash .github/scripts/build-plugins.sh build-out http://<your-pc-ip>:8080
```

## Credits and license

The action sheet hook in `patches/actionsheet.ts` follows the approach used in
[tralwdwd/revenge-next-plugins](https://github.com/tralwdwd/revenge-next-plugins) (GPL-3.0).
Because of that, this branch should stay under the GPL-3.0.
