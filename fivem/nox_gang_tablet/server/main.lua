local function BuildGangPayload(source)
    local Player = Gangs.GetPlayer(source)
    if not Player then
        return { hasGang = false, message = "Player not found" }
    end

    if not Gangs.HasGang(Player) then
        return { hasGang = false, message = "You are not in a gang" }
    end

    local gang = Gangs.GetGang(Player)
    local gangName = gang.name
    local members = Gangs.FetchMembers(gangName)
    local onlineCount = 0

    for _, member in ipairs(members) do
        if member.online then
            onlineCount = onlineCount + 1
        end
    end

    return {
        hasGang = true,
        canManage = Gangs.CanManage(Player),
        canWithdraw = Gangs.CanWithdrawTreasury(Player),
        canAccessStash = Gangs.CanAccessStash(Player),
        gang = {
            name = gangName,
            label = gang.label or gangName,
            grade = gang.grade and gang.grade.level or 0,
            gradeName = gang.grade and gang.grade.name or "Member",
            isboss = gang.isboss or false,
        },
        grades = Gangs.GetGrades(gangName),
        members = members,
        stats = {
            total = #members,
            online = onlineCount,
        },
        treasury = Config.Treasury.enabled and {
            balance = Treasury.GetBalance(gangName),
            canDeposit = true,
            canWithdraw = Gangs.CanWithdrawTreasury(Player),
            allowCash = Config.Treasury.allowCash,
            allowBank = Config.Treasury.allowBank,
        } or nil,
        stash = {
            id = Stash.GetId(gangName),
            slots = Config.Stash.slots,
            maxWeight = Config.Stash.maxWeight,
            canAccess = Gangs.CanAccessStash(Player),
        },
        playerCitizenId = Player.PlayerData.citizenid,
    }
end

CreateThread(function()
    Treasury.EnsureTable()
    if GetResourceState("ox_inventory") == "started" then
        Stash.RegisterAll()
    end
end)

AddEventHandler("onResourceStart", function(resource)
    if resource == "ox_inventory" or resource == GetCurrentResourceName() then
        Wait(500)
        Stash.RegisterAll()
    end
end)

lib.callback.register("nox_gang_tablet:getGangData", function(source)
    return BuildGangPayload(source)
end)

lib.callback.register("nox_gang_tablet:promoteMember", function(source, targetCitizenId)
    local Player = Gangs.GetPlayer(source)
    if not Gangs.CanManage(Player) then
        return { success = false, message = "You do not have permission to manage members" }
    end

    if not targetCitizenId or targetCitizenId == Player.PlayerData.citizenid then
        return { success = false, message = "Invalid member" }
    end

    local gangName = Gangs.GetGang(Player).name
    local target = Gangs.FindMember(gangName, targetCitizenId)
    if not target then
        return { success = false, message = "Member not found in your gang" }
    end

    if target.isboss then
        return { success = false, message = "Cannot promote the gang boss" }
    end

    local newGrade = target.grade + 1
    if newGrade > Gangs.GetMaxGradeLevel(gangName) then
        return { success = false, message = "Member is already at the highest rank" }
    end

    if not Gangs.SetMemberGang(targetCitizenId, gangName, newGrade) then
        return { success = false, message = "Failed to promote member" }
    end

    Gangs.BroadcastRefresh()
    return { success = true, message = "Member promoted" }
end)

lib.callback.register("nox_gang_tablet:demoteMember", function(source, targetCitizenId)
    local Player = Gangs.GetPlayer(source)
    if not Gangs.CanManage(Player) then
        return { success = false, message = "You do not have permission to manage members" }
    end

    if not targetCitizenId or targetCitizenId == Player.PlayerData.citizenid then
        return { success = false, message = "Invalid member" }
    end

    local gangName = Gangs.GetGang(Player).name
    local target = Gangs.FindMember(gangName, targetCitizenId)
    if not target then
        return { success = false, message = "Member not found in your gang" }
    end

    if target.isboss then
        return { success = false, message = "Cannot demote the gang boss" }
    end

    local newGrade = target.grade - 1
    if newGrade < 0 then
        return { success = false, message = "Member is already at the lowest rank" }
    end

    if not Gangs.SetMemberGang(targetCitizenId, gangName, newGrade) then
        return { success = false, message = "Failed to demote member" }
    end

    Gangs.BroadcastRefresh()
    return { success = true, message = "Member demoted" }
end)

lib.callback.register("nox_gang_tablet:kickMember", function(source, targetCitizenId)
    local Player = Gangs.GetPlayer(source)
    if not Gangs.CanManage(Player) then
        return { success = false, message = "You do not have permission to manage members" }
    end

    if not targetCitizenId or targetCitizenId == Player.PlayerData.citizenid then
        return { success = false, message = "Invalid member" }
    end

    local gangName = Gangs.GetGang(Player).name
    local target = Gangs.FindMember(gangName, targetCitizenId)
    if not target then
        return { success = false, message = "Member not found in your gang" }
    end

    if target.isboss then
        return { success = false, message = "Cannot kick the gang boss" }
    end

    if not Gangs.SetMemberGang(targetCitizenId, Config.NoGang, 0) then
        return { success = false, message = "Failed to remove member" }
    end

    if target.serverId then
        Gangs.Notify(target.serverId, "You have been removed from the gang", "error")
    end

    Gangs.BroadcastRefresh()
    return { success = true, message = "Member removed from gang" }
end)

lib.callback.register("nox_gang_tablet:invitePlayer", function(source, targetServerId)
    local Player = Gangs.GetPlayer(source)
    if not Gangs.CanManage(Player) then
        return { success = false, message = "You do not have permission to recruit" }
    end

    local targetId = tonumber(targetServerId)
    if not targetId then
        return { success = false, message = "Invalid player" }
    end

    local Target = Gangs.GetPlayer(targetId)
    if not Target then
        return { success = false, message = "Player is no longer online" }
    end

    if Gangs.HasGang(Target) then
        return { success = false, message = "Player is already in a gang" }
    end

    local gangName = Gangs.GetGang(Player).name
    if not Gangs.SetMemberGang(Target.PlayerData.citizenid, gangName, Config.RecruitGrade) then
        return { success = false, message = "Failed to recruit player" }
    end

    Gangs.Notify(
        targetId,
        ("You have been recruited to %s"):format(Gangs.GetGang(Player).label or gangName),
        "success"
    )

    Gangs.BroadcastRefresh()
    return { success = true, message = "Player recruited successfully" }
end)

lib.callback.register("nox_gang_tablet:getNearbyPlayers", function(source)
    local Player = Gangs.GetPlayer(source)
    if not Gangs.CanManage(Player) then
        return { players = {} }
    end

    local ped = GetPlayerPed(source)
    local coords = GetEntityCoords(ped)
    local nearby = {}

    for _, playerId in ipairs(Gangs.GetAllPlayerIds()) do
        if playerId ~= source then
            local targetPed = GetPlayerPed(playerId)
            local distance = #(coords - GetEntityCoords(targetPed))

            if distance <= Config.RecruitRadius then
                local Target = Gangs.GetPlayer(playerId)
                if Target and not Gangs.HasGang(Target) then
                    nearby[#nearby + 1] = {
                        serverId = playerId,
                        name = Target.PlayerData.charinfo.firstname .. " " .. Target.PlayerData.charinfo.lastname,
                        distance = math.floor(distance),
                    }
                end
            end
        end
    end

    table.sort(nearby, function(a, b)
        return a.distance < b.distance
    end)

    return { players = nearby }
end)

lib.callback.register("nox_gang_tablet:depositTreasury", function(source, payload)
    if not Config.Treasury.enabled then
        return { success = false, message = "Treasury is disabled" }
    end

    local Player = Gangs.GetPlayer(source)
    if not Gangs.HasGang(Player) then
        return { success = false, message = "You are not in a gang" }
    end

    local amount = math.floor(tonumber(payload and payload.amount) or 0)
    local accountType = payload and payload.accountType or "cash"

    if amount < Config.Treasury.minDeposit then
        return { success = false, message = "Invalid deposit amount" }
    end

    if accountType == "cash" and not Config.Treasury.allowCash then
        return { success = false, message = "Cash deposits are disabled" }
    end

    if accountType == "bank" and not Config.Treasury.allowBank then
        return { success = false, message = "Bank deposits are disabled" }
    end

    if accountType ~= "cash" and accountType ~= "bank" then
        return { success = false, message = "Invalid account type" }
    end

    if not Player.Functions.RemoveMoney(accountType, amount, "gang-treasury-deposit") then
        return { success = false, message = "Insufficient funds" }
    end

    local gangName = Gangs.GetGang(Player).name
    local balance = Treasury.Deposit(gangName, amount)
    Gangs.BroadcastRefresh()

    return {
        success = true,
        message = ("Deposited $%s"):format(amount),
        balance = balance,
    }
end)

lib.callback.register("nox_gang_tablet:withdrawTreasury", function(source, payload)
    if not Config.Treasury.enabled then
        return { success = false, message = "Treasury is disabled" }
    end

    local Player = Gangs.GetPlayer(source)
    if not Gangs.CanWithdrawTreasury(Player) then
        return { success = false, message = "You do not have permission to withdraw" }
    end

    local amount = math.floor(tonumber(payload and payload.amount) or 0)
    local accountType = payload and payload.accountType or "cash"

    if amount < Config.Treasury.minWithdraw then
        return { success = false, message = "Invalid withdrawal amount" }
    end

    if accountType ~= "cash" and accountType ~= "bank" then
        return { success = false, message = "Invalid account type" }
    end

    local gangName = Gangs.GetGang(Player).name
    local ok, balance = Treasury.Withdraw(gangName, amount)
    if not ok then
        return { success = false, message = "Insufficient gang funds", balance = balance }
    end

    Player.Functions.AddMoney(accountType, amount, "gang-treasury-withdraw")
    Gangs.BroadcastRefresh()

    return {
        success = true,
        message = ("Withdrew $%s"):format(amount),
        balance = balance,
    }
end)

lib.callback.register("nox_gang_tablet:openStash", function(source)
    local Player = Gangs.GetPlayer(source)
    if not Gangs.HasGang(Player) then
        return { success = false, message = "You are not in a gang" }
    end

    local gangName = Gangs.GetGang(Player).name
    local ok, message = Stash.OpenForPlayer(source, gangName)
    return { success = ok, message = message }
end)
