Treasury = Treasury or {}

function Treasury.EnsureTable()
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `nox_gang_accounts` (
            `gang_name` VARCHAR(50) NOT NULL,
            `balance` BIGINT NOT NULL DEFAULT 0,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`gang_name`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ]])
end

function Treasury.GetBalance(gangName)
    local row = MySQL.single.await(
        "SELECT balance FROM nox_gang_accounts WHERE gang_name = ?",
        { gangName }
    )
    return row and tonumber(row.balance) or 0
end

function Treasury.EnsureAccount(gangName)
    MySQL.insert.await(
        "INSERT IGNORE INTO nox_gang_accounts (gang_name, balance) VALUES (?, 0)",
        { gangName }
    )
end

function Treasury.Deposit(gangName, amount)
    Treasury.EnsureAccount(gangName)
    MySQL.update.await(
        "UPDATE nox_gang_accounts SET balance = balance + ? WHERE gang_name = ?",
        { amount, gangName }
    )
    return Treasury.GetBalance(gangName)
end

function Treasury.Withdraw(gangName, amount)
    Treasury.EnsureAccount(gangName)
    local balance = Treasury.GetBalance(gangName)
    if balance < amount then
        return false, balance
    end

    MySQL.update.await(
        "UPDATE nox_gang_accounts SET balance = balance - ? WHERE gang_name = ?",
        { amount, gangName }
    )

    return true, Treasury.GetBalance(gangName)
end
