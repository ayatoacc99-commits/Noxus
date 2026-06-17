# nox_gang_tablet

LB Tablet gang management app for **QB-Core** servers, built with **ox_lib**, **oxmysql**, and **ox_inventory**.

## Stack

| Dependency | Usage |
|------------|-------|
| **LB Tablet** | Custom app registration and NUI shell |
| **QB-Core** | Gang data, grades, `SetGang`, money |
| **ox_lib** | Callbacks and notifications |
| **oxmysql** | Member lookups and gang treasury |
| **ox_inventory** | Shared per-gang stash |

## Features

- **Members** — view online/offline roster, promote, demote, kick
- **Recruit** — invite gangless players within 10m
- **Treasury** — deposit cash/bank, leadership withdrawals
- **Stash** — open gang stash from the tablet via ox_inventory
- **Ranks** — view grade structure from `qb-core/shared/gangs.lua`

## Installation

1. Copy `fivem/nox_gang_tablet` into your server `resources` folder.
2. Import SQL (optional — table is auto-created on start):

```bash
mysql -u user -p your_database < sql/install.sql
```

3. Add to `server.cfg` **after** dependencies:

```cfg
ensure ox_lib
ensure oxmysql
ensure ox_inventory
ensure qb-core
ensure lb-tablet
ensure nox_gang_tablet
```

4. Restart the server and install **Gang Hub** from the LB Tablet app store.

## Configuration

Edit `config.lua`:

| Option | Default | Description |
|--------|---------|-------------|
| `Config.MinManageGrade` | `2` | Grade to manage members |
| `Config.MinTreasuryWithdrawGrade` | `2` | Grade to withdraw treasury |
| `Config.MinStashGrade` | `0` | Grade to open stash |
| `Config.RecruitRadius` | `10.0` | Recruitment scan distance |
| `Config.Stash.slots` | `50` | Gang stash slots |
| `Config.Stash.maxWeight` | `100000` | Gang stash weight |
| `Config.Treasury.allowCash` | `true` | Allow cash deposits |
| `Config.Treasury.allowBank` | `true` | Allow bank deposits |

## Development

```bash
cd ui
npm install
npm run dev
```

For live FiveM UI development, swap `ui_page` lines in `fxmanifest.lua`:

```lua
-- ui_page "ui/dist/index.html"
ui_page "http://localhost:3000"
```

Production build:

```bash
cd ui
npm run build
```

## How it works

- Registers with `exports["lb-tablet"]:AddCustomApp`
- NUI uses `fetchNui` → client `RegisterNUICallback` → `lib.callback.await`
- Server validates permissions before gang actions, treasury moves, or stash access
- Gang stashes are registered as `nox_gang_<gangname>` shared inventories in ox_inventory
- Treasury balances are stored in `nox_gang_accounts`

## License

MIT
