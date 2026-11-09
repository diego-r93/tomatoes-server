# Tomatoes frontend

Use Node.js 24.22.2 and Yarn Classic 1.22.22. Docker Compose supplies Node
for the frontend; the backend uses its own image.

## Install and run

```sh
yarn install --frozen-lockfile
yarn dev
```

`package.json` pins the tested versions of direct dependencies. `yarn.lock`
records the complete dependency tree. Commit both files when updating packages.
Do not edit `node_modules` or generate a second lock file with another package manager.

## Checks

```sh
yarn typecheck
yarn lint
node --test tests/*.test.mjs
yarn build
```

`yarn lint` reports problems without changing files. `yarn lint:fix` applies
automatic fixes.

Pump history, the Devices inventory and output command flow, and the Alerting
workspace use TypeScript. Existing JavaScript can still be imported. The
production Docker build runs `yarn typecheck` before compiling the app with Vite.

## Update dependencies

Check `yarn outdated`, review the official migration guides, then update the
versions in `package.json`. Run `yarn install` and, when needed, `yarn upgrade`
to refresh compatible indirect dependencies. Review the lock-file diff and run
the checks above before deploying. Routine restarts use `--frozen-lockfile` so
they cannot silently change the tested dependency tree.

The November 2026 migration uses Vue 3.5, Vuetify 4, Pinia 4, Vue Router 5,
Vite 8 and ESLint 10. New required peers are declared explicitly. Existing
routes, service endpoints and data formats are preserved.

The interface uses Vuetify 4's native Material Design 3 typography, elevation,
grid gaps and responsive breakpoints. There are no legacy grid, typography,
reset or shadow overrides. Theme palettes remain in Sass at
`src/styles/themes/_palettes.scss`.

`VDefaultsProvider` in `App.vue` maps the saved interface density to native
component props. Page-specific spacing variables only style application content.
`public/layers.css` must load before component styles to establish Vuetify's
native CSS cascade order. `vite-plugin-vuetify` uses precompiled component styles;
there is no Sass settings shim. The authenticated layout renders its page slot
inside `v-main`, alongside the working navigation drawer.

Verify the four instant themes, sidebar navigation, authentication redirects,
schedule filtering and editing, dialogs, dashboard charts, and mobile layouts.

The final Yarn audit reports two moderate findings for `minimatch` in ESLint's
development dependency tree. The reported fix requires major version 11,
outside ESLint's supported version range. No incompatible resolution is forced.

## Shared visual system

The interface uses a self-hosted Roboto variable font (Latin, weights 100–900). It is served by Vite with the application and does not request Google Fonts. The font comes from `@fontsource-variable/roboto` 5.3.0; its SIL Open Font License is included in `src/assets/fonts/Roboto/LICENSE.txt`.

`src/styles/_typography.scss` defines the font and the page, section, body, table and caption scales. `src/styles/_interface.scss` defines shared page spacing, control heights, table spacing, dialog styling and density. `src/styles/app.scss` loads both. Color palettes remain in `src/styles/themes/` and still change instantly.

## Device inventory

Devices uses the existing `/mqtt/getdevices` discovery API and `/mqtt/:host` output API. No example devices are included in the application. Search, sorting, pagination, display layout, MAC visibility and optional refresh operate on real discovery responses. Display preferences are saved in the current browser.

A device is Online only when it replied to the latest successful discovery and that response is less than 90 seconds old. Not seen means it is missing from that discovery or the response is stale; this is not continuous connection monitoring. The inventory retains previously discovered devices in memory until the page is reloaded. Failed requests keep the existing list; discovery requests have a 12-second client timeout.

Opening the page or selecting a device never publishes output states. A GPIO change requires confirmation and sends only the selected GPIO. The API confirms submission to MQTT; the interface waits for a later device response before changing the displayed state. Pending commands are marked unconfirmed after 30 seconds. Neither that timeout nor an HTTP error proves whether the hardware executed a command.

Run `yarn test:devices` for normalization, discovery merge and stale-response tests. Visual and interaction checks should use an isolated API fixture; do not toggle real hardware as a UI test.

## Device information and firmware overlays

Information opens a read-only dialog over Devices. It shows hardware identity, network data, discovery reception time and the last reported output states. Chip model, firmware/SDK version, uptime and heap details are shown only when those fields are present in the device reply. No firmware action or GPIO switch is included in that dialog.

Firmware opens over the same device list and preserves its search, selection and pagination. The upload interface retains the existing logo, Firmware/Filesystem selection, file drop area, progress and hostname/IP indicators. Closing or leaving through SPA navigation is blocked during upload. The target hostname and IP are captured when the window is opened; a changed IP requires reopening the window.

The existing multipart upload contract remains `POST http://<device-ip>/update` with `file` and `ip` fields. This UI change does not introduce a new device-side update protocol or mode-selection API. The request uses a separate Axios client so the Tomatoes session token is never forwarded to the ESP32. Real firmware flashing is not part of UI verification.

Legacy `/device/:id/info` and `/device/:id` links redirect to the corresponding dialog on `/device`. Display preferences and the device list stay on the same page when a dialog is opened normally.
