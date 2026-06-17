# LB Tablet — Gang Management

Custom [LB Tablet](https://docs.lbscripts.com/tablet/) app for **QB-Core** servers. Gang bosses and high-ranking members can view members, promote/demote, kick, and recruit nearby players directly from the in-game tablet.

## Requirements

- [LB Tablet](https://lbscripts.com/tablet)
- [QB-Core](https://github.com/qbcore-framework/qb-core)
- [oxmysql](https://github.com/overextended/oxmysql)

## Installation

1. Copy `fivem/lb-tablet-gang-mgmt` into your server `resources` folder.
2. Add to `server.cfg` **after** `lb-tablet`, `qb-core`, and `oxmysql`:

```cfg
ensure lb-tablet-gang-mgmt
```

3. Restart the server or run `ensure lb-tablet-gang-mgmt`.

The app appears in the LB Tablet app store as **Gang Management**. Install it on a tablet like any other custom app.

## Permissions

By default, players can manage members if either:

- `Player.PlayerData.gang.isboss` is `true`, or
- Their gang grade level is `>= Config.MinManageGrade` (default: `2`)

Adjust `config.lua` to match your server's rank structure.

## Features

| Tab | Description |
|-----|-------------|
| **Members** | View all gang members (online/offline), ranks, promote/demote/kick |
| **Recruit** | Find gangless players within 10m and recruit them |
| **Ranks** | View grade structure from `qb-core/shared/gangs.lua` |

Players without a gang see a read-only empty state.

## Development

To develop the UI with hot reload:

1. In `fxmanifest.lua`, comment out the production `ui_page` and uncomment the dev server line:

```lua
-- ui_page "ui/dist/index.html"
ui_page "http://localhost:3000"
```

2. Build tooling:

```bash
cd ui
npm install
npm run dev
```

3. Refresh the FiveM resource after Lua changes.

For production:

```bash
cd ui
npm run build
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `Config.Identifier` | `noxus-gang-mgmt` | LB Tablet app identifier |
| `Config.MinManageGrade` | `2` | Minimum grade to manage members |
| `Config.RecruitGrade` | `0` | Grade assigned to new recruits |
| `Config.NoGang` | `none` | Gang name for removed players |

## How it works

This resource follows the [LB Tablet custom apps](https://docs.lbscripts.com/tablet/script-integration/custom-apps/) pattern:

- Registers via `exports["lb-tablet"]:AddCustomApp`
- UI communicates through `fetchNui` / `RegisterNUICallback`
- Server uses QB-Core callbacks and `Player.Functions.SetGang` for online players
- Offline member updates write directly to the `players` table via oxmysql

## License

MIT — same as Noxus Panel.
