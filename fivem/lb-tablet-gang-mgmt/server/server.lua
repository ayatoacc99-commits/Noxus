local QBCore = exports["qb-core"]:GetCoreObject()

local function GetPlayerGang(Player)
    if not Player then return nil end
    return Player.PlayerData.gang
end

local function IsGangManager(Player)
    local gang = GetPlayerGang(Player)
    if not gang or not gang.name or gang.name == Config.NoGang then
        return false
    end
    if gang.isboss then return true end
    local grade = gang.grade and gang.grade.level or 0
    return grade >= Config.MinManageGrade
end

local function GetGangGrades(gangName)
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

local function GetMaxGradeLevel(gangName)
    local grades = GetGangGrades(gangName)
    local maxLevel = 0
    for _, grade in ipairs(grades) do
        if grade.level > maxLevel then
            maxLevel = grade.level
        end
    end
    return maxLevel
end

local function ParseCharName(charinfo, fallback)
    if type(charinfo) == "string" then
        charinfo = json.decode(charinfo) or {}
    end
    local first = charinfo.firstname or ""
    local last = charinfo.lastname or ""
    local full = (first .. " " .. last):gsub("^%s+", ""):gsub("%s+$", "")
    if full ~= "" then return full end
    return fallback or "Unknown"
end

local function GetOnlineCitizenIds()
    local online = {}
    for _, playerId in ipairs(QBCore.Functions.GetPlayers()) do
        local Player = QBCore.Functions.GetPlayer(playerId)
        if Player then
            online[Player.PlayerData.citizenid] = playerId
        end
    end
    return online
end

local function BuildMemberRow(row, onlineMap, gangName)
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
        name = ParseCharName(row.charinfo, row.name),
        grade = gang.grade and gang.grade.level or 0,
        gradeName = gang.grade and gang.grade.name or "Member",
        isboss = gang.isboss or false,
        online = serverId ~= nil,
        serverId = serverId,
    }
end

local function FetchGangMembers(gangName)
    local onlineMap = GetOnlineCitizenIds()
    local members = {}

    local rows = MySQL.query.await(
        "SELECT citizenid, charinfo, name, gang FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(gang, '$.name')) = ?",
        { gangName }
    )

    if not rows then
        -- Fallback for servers without JSON functions on gang column
        rows = MySQL.query.await("SELECT citizenid, charinfo, name, gang FROM players", {})
        if rows then
            local filtered = {}
            for _, row in ipairs(rows) do
                local gang = type(row.gang) == "string" and json.decode(row.gang) or row.gang
                if gang and gang.name == gangName then
                    filtered[#filtered + 1] = row
                end
            end
            rows = filtered
        end
    end

    for _, row in ipairs(rows or {}) do
        local member = BuildMemberRow(row, onlineMap, gangName)
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

local function GetPlayerByCitizenId(citizenid)
    local Player = QBCore.Functions.GetPlayerByCitizenId(citizenid)
    if Player then return Player end

    local row = MySQL.single.await("SELECT citizenid FROM players WHERE citizenid = ?", { citizenid })
    if not row then return nil end

    return { offline = true, citizenid = citizenid }
end

local function SetMemberGang(citizenid, gangName, gradeLevel)
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

QBCore.Functions.CreateCallback("noxus-gangmgmt:server:getGangData", function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then
        cb({ hasGang = false, message = "Player not found" })
        return
    end

    local gang = GetPlayerGang(Player)
    if not gang or not gang.name or gang.name == Config.NoGang then
        cb({ hasGang = false, message = "You are not in a gang" })
        return
    end

    local gangName = gang.name
    local members = FetchGangMembers(gangName)
    local onlineCount = 0
    for _, member in ipairs(members) do
        if member.online then onlineCount = onlineCount + 1 end
    end

    cb({
        hasGang = true,
        canManage = IsGangManager(Player),
        gang = {
            name = gangName,
            label = gang.label or gangName,
            grade = gang.grade and gang.grade.level or 0,
            gradeName = gang.grade and gang.grade.name or "Member",
            isboss = gang.isboss or false,
        },
        grades = GetGangGrades(gangName),
        members = members,
        stats = {
            total = #members,
            online = onlineCount,
        },
        playerCitizenId = Player.PlayerData.citizenid,
    })
end)

QBCore.Functions.CreateCallback("noxus-gangmgmt:server:promoteMember", function(source, cb, targetCitizenId)
    local Player = QBCore.Functions.GetPlayer(source)
    if not IsGangManager(Player) then
        cb({ success = false, message = "You do not have permission to manage members" })
        return
    end

    if not targetCitizenId or targetCitizenId == Player.PlayerData.citizenid then
        cb({ success = false, message = "Invalid member" })
        return
    end

    local gangName = Player.PlayerData.gang.name
    local members = FetchGangMembers(gangName)
    local target

    for _, member in ipairs(members) do
        if member.citizenid == targetCitizenId then
            target = member
            break
        end
    end

    if not target then
        cb({ success = false, message = "Member not found in your gang" })
        return
    end

    if target.isboss then
        cb({ success = false, message = "Cannot promote the gang boss" })
        return
    end

    local newGrade = target.grade + 1
    local maxGrade = GetMaxGradeLevel(gangName)

    if newGrade > maxGrade then
        cb({ success = false, message = "Member is already at the highest rank" })
        return
    end

    if not SetMemberGang(targetCitizenId, gangName, newGrade) then
        cb({ success = false, message = "Failed to promote member" })
        return
    end

    TriggerClientEvent("noxus-gangmgmt:client:refresh", -1)
    cb({ success = true, message = "Member promoted" })
end)

QBCore.Functions.CreateCallback("noxus-gangmgmt:server:demoteMember", function(source, cb, targetCitizenId)
    local Player = QBCore.Functions.GetPlayer(source)
    if not IsGangManager(Player) then
        cb({ success = false, message = "You do not have permission to manage members" })
        return
    end

    if not targetCitizenId or targetCitizenId == Player.PlayerData.citizenid then
        cb({ success = false, message = "Invalid member" })
        return
    end

    local gangName = Player.PlayerData.gang.name
    local members = FetchGangMembers(gangName)
    local target

    for _, member in ipairs(members) do
        if member.citizenid == targetCitizenId then
            target = member
            break
        end
    end

    if not target then
        cb({ success = false, message = "Member not found in your gang" })
        return
    end

    if target.isboss then
        cb({ success = false, message = "Cannot demote the gang boss" })
        return
    end

    local newGrade = target.grade - 1
    if newGrade < 0 then
        cb({ success = false, message = "Member is already at the lowest rank" })
        return
    end

    if not SetMemberGang(targetCitizenId, gangName, newGrade) then
        cb({ success = false, message = "Failed to demote member" })
        return
    end

    TriggerClientEvent("noxus-gangmgmt:client:refresh", -1)
    cb({ success = true, message = "Member demoted" })
end)

QBCore.Functions.CreateCallback("noxus-gangmgmt:server:kickMember", function(source, cb, targetCitizenId)
    local Player = QBCore.Functions.GetPlayer(source)
    if not IsGangManager(Player) then
        cb({ success = false, message = "You do not have permission to manage members" })
        return
    end

    if not targetCitizenId or targetCitizenId == Player.PlayerData.citizenid then
        cb({ success = false, message = "Invalid member" })
        return
    end

    local gangName = Player.PlayerData.gang.name
    local members = FetchGangMembers(gangName)
    local target

    for _, member in ipairs(members) do
        if member.citizenid == targetCitizenId then
            target = member
            break
        end
    end

    if not target then
        cb({ success = false, message = "Member not found in your gang" })
        return
    end

    if target.isboss then
        cb({ success = false, message = "Cannot kick the gang boss" })
        return
    end

    if not SetMemberGang(targetCitizenId, Config.NoGang, 0) then
        cb({ success = false, message = "Failed to remove member" })
        return
    end

    local TargetPlayer = QBCore.Functions.GetPlayerByCitizenId(targetCitizenId)
    if TargetPlayer then
        TriggerClientEvent("QBCore:Notify", TargetPlayer.PlayerData.source, "You have been removed from the gang", "error")
    end

    TriggerClientEvent("noxus-gangmgmt:client:refresh", -1)
    cb({ success = true, message = "Member removed from gang" })
end)

QBCore.Functions.CreateCallback("noxus-gangmgmt:server:invitePlayer", function(source, cb, targetServerId)
    local Player = QBCore.Functions.GetPlayer(source)
    if not IsGangManager(Player) then
        cb({ success = false, message = "You do not have permission to recruit" })
        return
    end

    local targetId = tonumber(targetServerId)
    if not targetId then
        cb({ success = false, message = "Invalid player" })
        return
    end

    local Target = QBCore.Functions.GetPlayer(targetId)
    if not Target then
        cb({ success = false, message = "Player is no longer online" })
        return
    end

    local targetGang = Target.PlayerData.gang
    if targetGang and targetGang.name and targetGang.name ~= Config.NoGang then
        cb({ success = false, message = "Player is already in a gang" })
        return
    end

    local gangName = Player.PlayerData.gang.name
    if not SetMemberGang(Target.PlayerData.citizenid, gangName, Config.RecruitGrade) then
        cb({ success = false, message = "Failed to recruit player" })
        return
    end

    TriggerClientEvent("QBCore:Notify", targetId, ("You have been recruited to %s"):format(Player.PlayerData.gang.label or gangName), "success")
    TriggerClientEvent("noxus-gangmgmt:client:refresh", -1)
    cb({ success = true, message = "Player recruited successfully" })
end)

QBCore.Functions.CreateCallback("noxus-gangmgmt:server:getNearbyPlayers", function(source, cb)
    local Player = QBCore.Functions.GetPlayer(source)
    if not IsGangManager(Player) then
        cb({ players = {} })
        return
    end

    local ped = GetPlayerPed(source)
    local coords = GetEntityCoords(ped)
    local nearby = {}

    for _, playerId in ipairs(QBCore.Functions.GetPlayers()) do
        if playerId ~= source then
            local targetPed = GetPlayerPed(playerId)
            local targetCoords = GetEntityCoords(targetPed)
            local distance = #(coords - targetCoords)

            if distance <= 10.0 then
                local Target = QBCore.Functions.GetPlayer(playerId)
                if Target then
                    local gang = Target.PlayerData.gang
                    if not gang or not gang.name or gang.name == Config.NoGang then
                        nearby[#nearby + 1] = {
                            serverId = playerId,
                            name = Target.PlayerData.charinfo.firstname .. " " .. Target.PlayerData.charinfo.lastname,
                            distance = math.floor(distance),
                        }
                    end
                end
            end
        end
    end

    table.sort(nearby, function(a, b)
        return a.distance < b.distance
    end)

    cb({ players = nearby })
end)
