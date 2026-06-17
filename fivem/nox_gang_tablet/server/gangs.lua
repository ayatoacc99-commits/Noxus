Gangs = Gangs or {}

local QBCore = exports["qb-core"]:GetCoreObject()

function Gangs.GetPlayer(source)
    return QBCore.Functions.GetPlayer(source)
end

function Gangs.GetGang(Player)
    if not Player then return nil end
    return Player.PlayerData.gang
end

function Gangs.HasGang(Player)
    local gang = Gangs.GetGang(Player)
    return gang and gang.name and gang.name ~= Config.NoGang
end

function Gangs.GetGradeLevel(Player)
    local gang = Gangs.GetGang(Player)
    return gang and gang.grade and gang.grade.level or 0
end

function Gangs.IsBoss(Player)
    local gang = Gangs.GetGang(Player)
    return gang and gang.isboss or false
end

function Gangs.CanManage(Player)
    if not Gangs.HasGang(Player) then return false end
    if Gangs.IsBoss(Player) then return true end
    return Gangs.GetGradeLevel(Player) >= Config.MinManageGrade
end

function Gangs.CanWithdrawTreasury(Player)
    if not Gangs.HasGang(Player) then return false end
    if Gangs.IsBoss(Player) then return true end
    return Gangs.GetGradeLevel(Player) >= Config.MinTreasuryWithdrawGrade
end

function Gangs.CanAccessStash(Player)
    if not Gangs.HasGang(Player) then return false end
    if Gangs.IsBoss(Player) then return true end
    return Gangs.GetGradeLevel(Player) >= Config.MinStashGrade
end

function Gangs.GetGrades(gangName)
    local shared = QBCore.Shared.Gangs[gangName]
    if not shared or not shared.grades then return {} end

    local grades = {}
    for level, grade in pairs(shared.grades) do
        grades[#grades + 1] = {
            level = tonumber(level) or 0,
            name = grade.name or ("Grade " .. tostring(level)),
            isboss = grade.isboss or false,
        }
    end

    table.sort(grades, function(a, b)
        return a.level < b.level
    end)

    return grades
end

function Gangs.GetMaxGradeLevel(gangName)
    local maxLevel = 0
    for _, grade in ipairs(Gangs.GetGrades(gangName)) do
        if grade.level > maxLevel then
            maxLevel = grade.level
        end
    end
    return maxLevel
end

function Gangs.ParseCharName(charinfo, fallback)
    if type(charinfo) == "string" then
        charinfo = json.decode(charinfo) or {}
    end
    local first = charinfo.firstname or ""
    local last = charinfo.lastname or ""
    local full = (first .. " " .. last):gsub("^%s+", ""):gsub("%s+$", "")
    if full ~= "" then return full end
    return fallback or "Unknown"
end

function Gangs.GetAllPlayerIds()
    return QBCore.Functions.GetPlayers()
end

function Gangs.GetOnlineCitizenIds()
    local online = {}
    for _, playerId in ipairs(Gangs.GetAllPlayerIds()) do
        local Player = QBCore.Functions.GetPlayer(playerId)
        if Player then
            online[Player.PlayerData.citizenid] = playerId
        end
    end
    return online
end

function Gangs.BuildMemberRow(row, onlineMap, gangName)
    local gang = row.gang
    if type(gang) == "string" then
        gang = json.decode(gang) or {}
    end

    if (gang.name or Config.NoGang) ~= gangName then
        return nil
    end

    local citizenid = row.citizenid
    local serverId = onlineMap[citizenid]

    return {
        citizenid = citizenid,
        name = Gangs.ParseCharName(row.charinfo, row.name),
        grade = gang.grade and gang.grade.level or 0,
        gradeName = gang.grade and gang.grade.name or "Member",
        isboss = gang.isboss or false,
        online = serverId ~= nil,
        serverId = serverId,
    }
end

function Gangs.FetchMembers(gangName)
    local onlineMap = Gangs.GetOnlineCitizenIds()
    local members = {}

    local rows = MySQL.query.await(
        "SELECT citizenid, charinfo, name, gang FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(gang, '$.name')) = ?",
        { gangName }
    )

    if not rows then
        rows = MySQL.query.await("SELECT citizenid, charinfo, name, gang FROM players", {})
        local filtered = {}
        for _, row in ipairs(rows or {}) do
            local gang = type(row.gang) == "string" and json.decode(row.gang) or row.gang
            if gang and gang.name == gangName then
                filtered[#filtered + 1] = row
            end
        end
        rows = filtered
    end

    for _, row in ipairs(rows or {}) do
        local member = Gangs.BuildMemberRow(row, onlineMap, gangName)
        if member then
            members[#members + 1] = member
        end
    end

    table.sort(members, function(a, b)
        if a.grade == b.grade then
            if a.online == b.online then
                return a.name < b.name
            end
            return a.online
        end
        return a.grade > b.grade
    end)

    return members
end

function Gangs.SetMemberGang(citizenid, gangName, gradeLevel)
    local Player = QBCore.Functions.GetPlayerByCitizenId(citizenid)
    if Player then
        return Player.Functions.SetGang(gangName, gradeLevel)
    end

    local gangDef = QBCore.Shared.Gangs[gangName]
    if not gangDef then return false end

    local gradeKey = tostring(gradeLevel)
    local gradeDef = gangDef.grades[gradeKey] or gangDef.grades[gradeLevel]
    if not gradeDef then return false end

    local gangPayload = {
        name = gangName,
        label = gangDef.label or gangName,
        grade = {
            name = gradeDef.name,
            level = gradeLevel,
        },
        isboss = gradeDef.isboss or false,
    }

    MySQL.update.await(
        "UPDATE players SET gang = ? WHERE citizenid = ?",
        { json.encode(gangPayload), citizenid }
    )

    return true
end

function Gangs.FindMember(gangName, citizenid)
    for _, member in ipairs(Gangs.FetchMembers(gangName)) do
        if member.citizenid == citizenid then
            return member
        end
    end
    return nil
end

function Gangs.BroadcastRefresh()
    TriggerClientEvent("nox_gang_tablet:client:refresh", -1)
end

function Gangs.Notify(source, message, ntype)
    TriggerClientEvent("ox_lib:notify", source, {
        title = Config.App.name,
        description = message,
        type = ntype or "inform",
    })
end
