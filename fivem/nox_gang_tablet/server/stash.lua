Stash = Stash or {}

local QBCore = exports["qb-core"]:GetCoreObject()

function Stash.GetId(gangName)
    return Config.Stash.prefix .. gangName
end

function Stash.RegisterAll()
    for gangName, gangData in pairs(QBCore.Shared.Gangs) do
        if gangName ~= Config.NoGang then
            exports.ox_inventory:RegisterStash(
                Stash.GetId(gangName),
                (gangData.label or gangName) .. " Stash",
                Config.Stash.slots,
                Config.Stash.maxWeight,
                false
            )
        end
    end
end

function Stash.OpenForPlayer(source, gangName)
    local Player = Gangs.GetPlayer(source)
    if not Gangs.CanAccessStash(Player) then
        return false, "You do not have permission to access the gang stash"
    end

    local playerGang = Gangs.GetGang(Player)
    if not playerGang or playerGang.name ~= gangName then
        return false, "You are not in this gang"
    end

    TriggerClientEvent("nox_gang_tablet:client:openStash", source, Stash.GetId(gangName))
    return true, "Stash opened"
end
