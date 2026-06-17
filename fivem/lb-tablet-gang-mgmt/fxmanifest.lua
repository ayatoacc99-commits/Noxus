fx_version "cerulean"
game "gta5"

title "LB Tablet - Gang Management"
description "Gang management app for LB Tablet (QB-Core)."
author "Noxus Panel"

lua54 "yes"

shared_script "config.lua"
client_script "client/**.lua"
server_script "@oxmysql/lib/MySQL.lua"
server_script "server/**.lua"

files {
    "ui/dist/**/*",
    "ui/icon.png"
}

ui_page "ui/dist/index.html"
-- ui_page "http://localhost:3000"

dependencies {
    "lb-tablet",
    "qb-core",
    "oxmysql",
}
