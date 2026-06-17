fx_version "cerulean"
game "gta5"

name "nox_gang_tablet"
title "Nox Gang Tablet"
description "Gang management LB Tablet app for QB-Core with ox_lib, ox_inventory, and oxmysql."
author "Noxus Panel"
version "1.0.0"

lua54 "yes"

shared_scripts {
    "@ox_lib/init.lua",
    "config.lua",
}

client_scripts {
    "client/main.lua",
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "server/gangs.lua",
    "server/treasury.lua",
    "server/stash.lua",
    "server/main.lua",
}

files {
    "ui/dist/**/*",
    "ui/icon.png",
}

ui_page "ui/dist/index.html"
-- ui_page "http://localhost:3000"

dependencies {
    "lb-tablet",
    "qb-core",
    "ox_lib",
    "oxmysql",
    "ox_inventory",
}
