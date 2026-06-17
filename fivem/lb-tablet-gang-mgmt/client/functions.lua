---@param action string
---@param data any
function SendAppMessage(action, data)
    exports["lb-tablet"]:SendCustomAppMessage(Config.Identifier, action, data)
end
