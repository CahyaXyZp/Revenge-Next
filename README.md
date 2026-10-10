# Revenge-Next

Hosts the Revenge Next bundle and my Revenge Next plugins on GitHub Pages.

| What | URL |
| --- | --- |
| Revenge bundle | `https://cahyaxyzp.github.io/Revenge-Next/revenge.bundle` |
| Plugin repository | `https://cahyaxyzp.github.io/Revenge-Next/plugins/` |

## Install the plugins

In Revenge Next, open **Settings → Plugins → Advanced**, add the plugin repository URL above, then
press **+** to browse and install.

## Plugins

### Server Tweaks

Small quality-of-life tweaks for servers and channels.

- **Copy Channel Name**: adds a button to the channel long-press menu (text, voice, announcement
  channels, threads and forum posts) that copies the channel name.

## How publishing works

One workflow, `.github/workflows/update-bundle.yml`, owns the whole Pages site, because every Pages
deploy replaces the site.

- Every 6 hours it checks for a newer production bundle and deploys when there is one.
- Every push to `main` that touches `plugins/` rebuilds the plugin repository and deploys it.
  If there is no new bundle, the currently published one is reused.
- Pull requests build the plugins and validate the index without deploying. The built repository is
  attached to the run as the `plugin-repository` artifact.

**To release a plugin update, raise `version` in its `manifest.json`.** Revenge only offers an
update when the version is higher than the one a user has installed.

## Layout

```
plugins/
└── server-tweaks/
    ├── manifest.json
    └── js/
        ├── index.ts                      plugin entry
        ├── patches/actionsheet.ts        hooks Discord's long-press menus
        └── features/copy-channel-name.tsx
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
bash .github/scripts/build-plugins.sh site/plugins http://<your-pc-ip>:8080/plugins
```

## Credits and license

The action sheet hook in `patches/actionsheet.ts` follows the approach used in
[tralwdwd/revenge-next-plugins](https://github.com/tralwdwd/revenge-next-plugins) (GPL-3.0).
Because of that, this repository should stay under the GPL-3.0.
