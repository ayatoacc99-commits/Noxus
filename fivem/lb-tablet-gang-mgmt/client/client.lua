local QBCore = exports["qb-core"]:GetCoreObject()

while GetResourceState("lb-tablet") ~= "started" do
    Wait(500)
end

local resourceName = GetCurrentResourceName()
local url = GetResourceMetadata(resourceName, "ui_page", 0)

local function AddApp()
    Wait(500)

    local success, reason = exports["lb-tablet"]:AddCustomApp({
        identifier = Config.Identifier,
        name = Config.Name,
        description = Config.Description,
        defaultApp = Config.DefaultApp,
        developer = Config.Developer,
        ui = url,
        icon = url:find("http") and (url .. "/icon.png") or ("https://cfx-nui-" .. resourceName .. "/ui/icon.png"),
        onOpen = function()
            SendAppMessage("appOpened", {})
        end,
    })

    if not success then
        print(("[lb-tablet-gang-mgmt] Failed to register app: %s"):format(reason or "unknown"))
    end
end

local function TriggerCallback(name, cb, ...)
    QBCore.Functions.TriggerCallback(name, cb, ...)
end

RegisterNUICallback("getGangData", function(_, cb)
    TriggerCallback("noxus-gangmgmt:server:getGangData", function(data)
        cb(data or { error = "Failed to load gang data" })
    end)
end)

RegisterNUICallback("promoteMember", function(data, cb)
    TriggerCallback("noxus-gangmgmt:server:promoteMember", function(result)
        cb(result or { success = false, message = "Request failed" })
    end, data.citizenid)
end)

RegisterNUICallback("demoteMember", function(data, cb)
    TriggerCallback("noxus-gangmgmt:server:demoteMember", function(result)
        cb(result or { success = false, message = "Request failed" })
    end, data.citizenid)
end)

RegisterNUICallback("kickMember", function(data, cb)
    TriggerCallback("noxus-gangmgmt:server:kickMember", function(result)
        cb(result or { success = false, message = "Request failed" })
    end, data.citizenid)
end)

RegisterNUICallback("invitePlayer", function(data, cb)
    TriggerCallback("noxus-gangmgmt:server:invitePlayer", function(result)
        cb(result or { success = false, message = "Request failed" })
    end, data.serverId)
end)

RegisterNUICallback("getNearbyPlayers", function(_, cb)
    TriggerCallback("noxus-gangmgmt:server:getNearbyPlayers", function(result)
        cb(result or { players = {} })
    end)
end)

RegisterNUICallback("notify", function(data, cb)
    if data.message then
        QBCore.Functions.Notify(data.message, data.type or "primary", data.duration or 5000)
    end
    cb("ok")
end)

AddApp()

AddEventHandler("onResourceStart", function(resource)
    if resource == "lb-tablet" then
        AddApp()
    end
end)

RegisterNetEvent("noxus-gangmgmt:client:refresh", function()
    SendAppMessage("gangUpdated", {})
end)
