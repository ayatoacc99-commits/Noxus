Config = {}

Config.Identifier = "noxus-gang-mgmt"
Config.DefaultApp = false

Config.Name = "Gang Management"
Config.Description = "Manage your gang members, ranks, and recruitment."
Config.Developer = "Noxus Panel"

-- Minimum grade level required to manage members (falls back to isboss if grade not set)
Config.MinManageGrade = 2

-- Grade assigned when recruiting new members
Config.RecruitGrade = 0

-- Gang name used when removing a member (QB-Core default)
Config.NoGang = "none"
