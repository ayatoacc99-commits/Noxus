local resourceName = GetCurrentResourceName()

while GetResourceState("lb-tablet") ~= "started" do
    Wait(500)
end

local function SendAppMessage(action, data)
    exports["lb-tablet"]:SendCustomAppMessage(Config.App.identifier, action, data)
end

local function AwaitCallback(name, ...)
    return lib.callback.await(name, false, ...)
end

local function RegisterApp()
    Wait(500)

    local url = GetResourceMetadata(resourceName, "ui_page", 0)
    local success, reason = exports["lb-tablet"]:AddCustomApp({
        identifier = Config.App.identifier,
        name = Config.App.name,
        description = Config.App.description,
        defaultApp = Config.App.defaultApp,
        developer = Config.App.developer,
        ui = url,
        icon = url:find("http") and (url .. "/icon.png") or ("https://cfx-nui-" .. resourceName .. "/ui/icon.png"),
        onOpen = function()
            SendAppMessage("appOpened", {})
        end,
    })

    if not success then
        print(("[nox_gang_tablet] Failed to register app: %s"):format(reason or "unknown"))
    end
end

local nuiHandlers = {
    getGangData = function(_, cb)
        cb(AwaitCallback("nox_gang_tablet:getGangData"))
    end,
    promoteMember = function(data, cb)
        cb(AwaitCallback("nox_gang_tablet:promoteMember", data.citizenid))
    end,
    demoteMember = function(data, cb)
        cb(AwaitCallback("nox_gang_tablet:demoteMember", data.citizenid))
    end,
    kickMember = function(data, cb)
        cb(AwaitCallback("nox_gang_tablet:kickMember", data.citizenid))
    end,
    invitePlayer = function(data, cb)
        cb(AwaitCallback("nox_gang_tablet:invitePlayer", data.serverId))
    end,
    getNearbyPlayers = function(_, cb)
        cb(AwaitCallback("nox_gang_tablet:getNearbyPlayers"))
    end,
    depositTreasury = function(data, cb)
        cb(AwaitCallback("nox_gang_tablet:depositTreasury", data))
    end,
    withdrawTreasury = function(data, cb)
        cb(AwaitCallback("nox_gang_tablet:withdrawTreasury", data))
    end,
    openStash = function(_, cb)
        cb(AwaitCallback("nox_gang_tablet:openStash"))
    end,
    notify = function(data, cb)
        if data.message then
            lib.notify({
                title = Config.App.name,
                description = data.message,
                type = data.type or "inform",
            })
        end
        cb("ok")
    end,
}

for event, handler in pairs(nuiHandlers) do
    RegisterNUICallback(event, handler)
end

RegisterNetEvent("nox_gang_tablet:client:refresh", function()
    SendAppMessage("gangUpdated", {})
end)

RegisterNetEvent("nox_gang_tablet:client:openStash", function(stashId)
    exports.ox_inventory:openInventory("stash", stashId)
end)

RegisterApp()

AddEventHandler("onResourceStart", function(resource)
    if resource == "lb-tablet" then
        RegisterApp()
    end
end)
