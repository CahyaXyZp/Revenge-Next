# Revenge-Next

Hosts the Revenge Next bundle and my Revenge Next plugins.

| What | Where |
| --- | --- |
| Revenge bundle | GitHub Pages, deployed by `update-bundle.yml`: `https://cahyaxyzp.github.io/Revenge-Next/revenge.bundle` |
| Plugin repository | the `plugin-dist` branch, deployed by `build-plugins.yml`: `https://raw.githubusercontent.com/CahyaXyZp/Revenge-Next/plugin-dist/` |

The two are independent. `build-plugins.yml` never touches GitHub Pages, so it cannot affect the bundle.

## Install the plugins

In Revenge Next, open **Settings → Plugins → Advanced**, add the plugin repository URL above, then
press **+** to browse and install.

## Plugins

### Server Tweaks

Small quality-of-life tweaks for servers and channels.

- **Copy Channel Name**: adds a button to the channel long-press menu (text, voice, announcement
  channels, threads and forum posts) that copies the channel name.

## How publishing works

- A push to `main` that touches `plugins/` runs `build-plugins.yml`. It bundles every plugin, zips
  each one as `<id>@<version>.zip`, adds new versions to `pool/` on the `plugin-dist` branch and
  regenerates `index.json` from everything in the pool.
- A version that is already on the branch is never overwritten. **To release a change, raise
  `version` in the plugin's `manifest.json`.** Revenge also only offers an update when the version
  is higher than the one installed.
- Pull requests build the plugins without publishing, and attach the result to the run as the
  `plugin-repository` artifact.
- raw.githubusercontent.com caches files for a few minutes, so a new release can take a little
  while to show up.

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

To add a feature, create `js/features/<name>.tsx` that exports a `register...(cleanup)` function and
call it from `js/index.ts`. To add a row to a long-press menu, call
`registerActionSheetPatch(key, (groups, props) => { ... })` as `copy-channel-name.tsx` does.

To add another plugin, create `plugins/<name>/manifest.json` and `plugins/<name>/js/index.ts`. Only
JS-only plugins are supported by the build script.

## Build locally

```sh
bun install
bun --bun run build
bash .github/scripts/build-plugins.sh build-out http://<your-pc-ip>:8080
```

## Credits and license

The action sheet hook in `patches/actionsheet.ts` follows the approach used in
[tralwdwd/revenge-next-plugins](https://github.com/tralwdwd/revenge-next-plugins) (GPL-3.0).
Because of that, this repository should stay under the GPL-3.0.
