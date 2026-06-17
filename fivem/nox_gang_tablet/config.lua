Config = {}

Config.App = {
    identifier = "nox-gang-tablet",
    name = "Gang Hub",
    description = "Manage members, treasury, and gang stash.",
    developer = "Noxus Panel",
    defaultApp = false,
}

Config.NoGang = "none"

-- Grade required to promote/demote/kick/recruit
Config.MinManageGrade = 2

-- Grade required to withdraw from treasury (deposit is open to all members)
Config.MinTreasuryWithdrawGrade = 2

-- Grade required to open the gang stash from the tablet
Config.MinStashGrade = 0

-- Grade assigned to recruited players
Config.RecruitGrade = 0

-- Nearby recruitment scan radius (meters)
Config.RecruitRadius = 10.0

Config.Stash = {
    prefix = "nox_gang_",
    slots = 50,
    maxWeight = 100000,
}

Config.Treasury = {
    enabled = true,
    minDeposit = 1,
    minWithdraw = 1,
    allowCash = true,
    allowBank = true,
}
