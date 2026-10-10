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

Adds these rows to the channel long-press menu. They sit in the same group as Discord's own
"Copy Channel ID" row (or in the last group when developer mode is off):

- **Copy Channel Name**: text, announcement and forum channels, threads and forum posts.
- **Copy Voice Name**: voice and stage channels.
- **Copy Category Name**: channel categories.
- **Copy Channel Description**: channels that have a topic.

### Bot Manager

Brings the **Bots and Apps** section from the desktop app to **Server Settings > Integrations**.
It appears under Webhooks and Channels Followed, with a search field and one row per installed app
(icon, who added it and when, Verified Bot, Commands). Tap an app to see its details and copy its
IDs or invite link. Version 0.2 is read-only. The section is found by the English labels
"Webhooks" and "Channels Followed", and a toast shows when it was added.

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
├── bot-manager/
│   ├── manifest.json
│   └── js/
│       ├── index.ts
│       ├── features/integrations.tsx     adds the section to Integrations
│       ├── ui/apps-section.tsx           search field and app rows
│       ├── ui/app-sheet.tsx              details of one app
│       └── lib/                          REST call, toast helpers
└── server-tweaks/
    ├── manifest.json
    └── js/
        ├── index.ts                      plugin entry
        ├── patches/actionsheet.ts        hooks Discord's long-press menus
        ├── patches/add-rows.tsx          puts rows next to Discord's own rows
        └── features/copy-channel-info.tsx
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
`registerActionSheetPatch(key, (groups, props) => { ... })` and `addRowsToSheet(groups, rows)` as
`copy-channel-info.tsx` does.

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
