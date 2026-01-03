const WebSocket = require('ws')
const { Client } = require('node-osc')
const fs = require('fs')
const path = require('path')

/**
 * Validate widget ID format (UUID)
 * @param {string} widgetId
 * @returns {boolean}
 */
const isValidWidgetId = (widgetId) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(widgetId)
}

/**
 * Load and validate OSC parameters configuration
 * @returns {{valid: boolean, config?: any, error?: string}}
 */
const loadOSCConfig = () => {
    const configPath = path.join(__dirname, '..', 'osc_parameters.json')
    const defaultConfig = {
        _help: {
            _note: "This section is ignored - it's just for reference",
            "Quick Guide": "See OSC_CONFIG_README.md for full documentation",
            "Simple Mode": "Use 'outputRange' for easy range mapping",
            "Advanced Mode": "Use 'value' with math expressions for custom formulas",
            "Types": "int (whole numbers), float (decimals), bool (true/false)"
        },
        _examples: {
            _note: "Example configurations (delete this section or keep for reference)",
            "Simple int range": { name: "MyParameter", address: "/avatar/parameters/MyParam", type: "int", outputRange: [0, 200] },
            "Simple float range": { name: "Normalized", address: "/avatar/parameters/Normalized", type: "float", outputRange: [0.0, 1.0] },
            "Custom input/output": { name: "CustomScale", address: "/avatar/parameters/Custom", type: "float", inputRange: [60, 180], outputRange: [0.0, 1.0] },
            "Advanced math": { name: "Advanced", address: "/avatar/parameters/Advanced", type: "float", value: "heartRate / 127 - 1" },
            "Toggle boolean": { name: "Toggle", address: "/avatar/parameters/Toggle", type: "bool", value: "toggle" }
        },
        parameters: [
            { name: "HR", address: "/avatar/parameters/HR", type: "int", outputRange: [0, 255] },
            { name: "Heartrate", address: "/avatar/parameters/Heartrate", type: "float", value: "heartRate / 127 - 1" },
            { name: "Heartrate2", address: "/avatar/parameters/Heartrate2", type: "float", outputRange: [0.0, 1.0] },
            { name: "HeartBeatToggle", address: "/avatar/parameters/HeartBeatToggle", type: "bool", value: "toggle" }
        ]
    }

    // Create default config if missing
    if (!fs.existsSync(configPath)) {
        console.log('[INFO] No osc_parameters.json found, creating default config...')
        try {
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
            console.log('[INFO] Created default osc_parameters.json')
        } catch (err) {
            return { valid: false, error: `Failed to create default config: ${err.message}` }
        }
    }

    // Load config
    let configData
    try {
        configData = fs.readFileSync(configPath, 'utf-8')
    } catch (err) {
        return { valid: false, error: `Failed to read config file: ${err.message}` }
    }

    // Parse JSON
    let config
    try {
        config = JSON.parse(configData)
    } catch (err) {
        return { valid: false, error: `Invalid JSON in config file: ${err.message}` }
    }

    // Validate structure
    if (!config.parameters || !Array.isArray(config.parameters)) {
        return { valid: false, error: 'Config must have a "parameters" array' }
    }

    if (config.parameters.length === 0) {
        return { valid: false, error: 'Config must have at least one parameter defined' }
    }

    // Validate each parameter
    const validTypes = ['int', 'float', 'bool']
    const addresses = new Set()

    for (let i = 0; i < config.parameters.length; i++) {
        const param = config.parameters[i]
        const prefix = `Parameter ${i + 1} (${param.name || 'unnamed'})`

        if (!param.name || typeof param.name !== 'string') {
            return { valid: false, error: `${prefix}: Missing or invalid "name" field` }
        }

        if (!param.address || typeof param.address !== 'string') {
            return { valid: false, error: `${prefix}: Missing or invalid "address" field` }
        }

        if (!param.address.startsWith('/avatar/parameters/')) {
            return { valid: false, error: `${prefix}: Address must start with "/avatar/parameters/"` }
        }

        if (addresses.has(param.address)) {
            return { valid: false, error: `${prefix}: Duplicate address "${param.address}"` }
        }
        addresses.add(param.address)

        if (!param.type || !validTypes.includes(param.type)) {
            return { valid: false, error: `${prefix}: Type must be one of: ${validTypes.join(', ')}` }
        }

        // Validate value mode (either 'value' OR 'outputRange', not both)
        const hasValue = param.value !== undefined
        const hasOutputRange = param.outputRange !== undefined
        const hasInputRange = param.inputRange !== undefined

        if (!hasValue && !hasOutputRange) {
            return { valid: false, error: `${prefix}: Must have either "value" or "outputRange" field` }
        }

        if (hasValue && hasOutputRange) {
            return { valid: false, error: `${prefix}: Cannot use both "value" and "outputRange" - choose one` }
        }

        if (hasInputRange && !hasOutputRange) {
            return { valid: false, error: `${prefix}: "inputRange" requires "outputRange"` }
        }

        // Validate value expression (advanced mode)
        if (hasValue) {
            if (typeof param.value !== 'string') {
                return { valid: false, error: `${prefix}: "value" must be a string` }
            }

            if (param.value !== 'toggle' && param.value !== 'heartRate') {
                // Check if it's a safe math expression
                const safePattern = /^heartRate\s*[\+\-\*\/\s\d\.\(\)]+$/
                if (!safePattern.test(param.value)) {
                    return { valid: false, error: `${prefix}: Invalid value expression "${param.value}". Use "heartRate", "toggle", or math like "heartRate / 127 - 1"` }
                }
            }
        }

        // Validate outputRange (simple mode)
        if (hasOutputRange) {
            if (!Array.isArray(param.outputRange) || param.outputRange.length !== 2) {
                return { valid: false, error: `${prefix}: "outputRange" must be an array with 2 numbers [min, max]` }
            }
            if (typeof param.outputRange[0] !== 'number' || typeof param.outputRange[1] !== 'number') {
                return { valid: false, error: `${prefix}: "outputRange" values must be numbers` }
            }
            if (param.outputRange[0] >= param.outputRange[1]) {
                return { valid: false, error: `${prefix}: "outputRange" min must be less than max` }
            }
        }

        // Validate inputRange (optional with outputRange)
        if (hasInputRange) {
            if (!Array.isArray(param.inputRange) || param.inputRange.length !== 2) {
                return { valid: false, error: `${prefix}: "inputRange" must be an array with 2 numbers [min, max]` }
            }
            if (typeof param.inputRange[0] !== 'number' || typeof param.inputRange[1] !== 'number') {
                return { valid: false, error: `${prefix}: "inputRange" values must be numbers` }
            }
            if (param.inputRange[0] >= param.inputRange[1]) {
                return { valid: false, error: `${prefix}: "inputRange" min must be less than max` }
            }
        }
    }

    return { valid: true, config }
}

/**
 * Map value from input range to output range
 * @param {number} value
 * @param {number[]} inputRange
 * @param {number[]} outputRange
 * @returns {number}
 */
const mapRange = (value, inputRange, outputRange) => {
    const [inMin, inMax] = inputRange
    const [outMin, outMax] = outputRange

    // Clamp input value to input range
    const clampedValue = Math.max(inMin, Math.min(inMax, value))

    // Map to output range
    const normalized = (clampedValue - inMin) / (inMax - inMin)
    return outMin + normalized * (outMax - outMin)
}

/**
 * Evaluate parameter value
 * @param {object} param - Parameter config
 * @param {number} heartRate
 * @param {object} state
 * @returns {any}
 */
const evaluateParameterValue = (param, heartRate, state) => {
    // Simple range mode
    if (param.outputRange) {
        const inputRange = param.inputRange || [0, 255]
        return mapRange(heartRate, inputRange, param.outputRange)
    }

    // Advanced expression mode
    const expression = param.value

    if (expression === 'toggle') {
        return state.toggle
    }

    if (expression === 'heartRate') {
        return heartRate
    }

    // Evaluate math expression safely
    try {
        // Replace heartRate with actual value and evaluate
        const sanitized = expression.replace(/heartRate/g, heartRate.toString())
        // Only allow numbers, operators, parentheses, dots, and whitespace
        if (!/^[\d\+\-\*\/\.\(\)\s]+$/.test(sanitized)) {
            throw new Error('Invalid characters in expression')
        }
        return eval(sanitized)
    } catch (err) {
        console.log('[WARNING] Failed to evaluate expression "%s": %s', expression, err.message)
        return heartRate
    }
}

/**
 * Get WebSocket URL from Pulsoid widget RPC
 * @param {string} widgetId 
 * @returns {Promise<{url: string, status: string}>}
 */
const getWebSocketUrl = async (widgetId) => {
    let response
    try {
        response = await fetch('https://pulsoid.net/v1/api/public/rpc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rpc-method': 'getWidget'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'getWidget',
                params: { widgetId },
                id: '1'
            })
        })
    } catch (err) {
        throw new Error(`NETWORK_ERROR: Cannot reach Pulsoid servers - ${err.message}`)
    }

    if (!response.ok) {
        throw new Error(`HTTP_ERROR: Pulsoid returned status ${response.status}`)
    }

    let data
    try {
        data = await response.json()
    } catch (err) {
        throw new Error('PARSE_ERROR: Invalid response from Pulsoid')
    }

    if (data.error) {
        if (data.error.message?.includes('not found') || data.error.code === -32600) {
            throw new Error('WIDGET_NOT_FOUND: Widget ID does not exist or was deleted')
        }
        throw new Error(`RPC_ERROR: ${data.error.message || 'Unknown RPC error'}`)
    }

    if (!data.result) {
        throw new Error('WIDGET_NOT_FOUND: Widget ID does not exist')
    }

    if (!data.result.ramielUrl) {
        throw new Error('WIDGET_INACTIVE: Widget exists but is not currently streaming (no active heart rate source)')
    }

    return {
        url: data.result.ramielUrl,
        status: data.result.status || 'unknown'
    }
}

/**
 * @param {string} widgetId
 */
const RunWidget = async (widgetId) => {
    let hbToggle = false
    let lastDataTime = null
    let noDataWarningShown = false
    let noDataWarningCount = 0
    let ws = null
    let heartbeatInterval = null
    let dataCheckInterval = null
    let reconnectAttempts = 0
    let wsUrl = null

    console.log('========================================')
    console.log('  Pulsoid Widget to VRChat OSC')
    console.log('========================================')
    console.log('[INFO] Widget ID: %s', widgetId)

    // Load and validate OSC parameter configuration
    const configResult = loadOSCConfig()
    if (!configResult.valid) {
        console.log('[ERROR] Failed to load OSC configuration!')
        console.log('[ERROR] %s', configResult.error)
        console.log('[INFO] Fix osc_parameters.json and restart')
        process.exit(1)
    }
    const oscConfig = configResult.config
    console.log('[INFO] Loaded %d OSC parameter(s) from config', oscConfig.parameters.length)

    // Validate widget ID format
    if (!isValidWidgetId(widgetId)) {
        console.log('[ERROR] Invalid widget ID format!')
        console.log('[INFO] Widget ID should be a UUID like: a1b2c3d4-e5f6-7890-abcd-ef1234567890')
        console.log('[INFO] Get your widget ID from: https://pulsoid.net/ui/widgets')
        process.exit(1)
    }

    // Fetch WebSocket URL with detailed error handling
    const fetchWebSocketUrl = async () => {
        console.log('[STATUS] Fetching WebSocket URL from Pulsoid...')
        try {
            const result = await getWebSocketUrl(widgetId)
            wsUrl = result.url
            console.log('[STATUS] Got WebSocket URL!')
            return true
        } catch (err) {
            const errorType = err.message.split(':')[0]

            switch (errorType) {
                case 'NETWORK_ERROR':
                    console.log('[ERROR] Cannot connect to Pulsoid servers')
                    console.log('[INFO] Check your internet connection')
                    break
                case 'WIDGET_NOT_FOUND':
                    console.log('[ERROR] Widget not found!')
                    console.log('[INFO] Your widget ID does not exist or was deleted')
                    console.log('[INFO] Get your correct widget ID from: https://pulsoid.net/ui/widgets')
                    break
                case 'WIDGET_INACTIVE':
                    console.log('[WARNING] Widget exists but is not active!')
                    console.log('[INFO] Possible reasons:')
                    console.log('[INFO]   - Heart rate monitor is not connected to Pulsoid')
                    console.log('[INFO]   - Pulsoid app is not running on your phone/watch')
                    console.log('[INFO]   - Widget was created but never activated')
                    console.log('[INFO] Start your heart rate monitor and Pulsoid app first!')
                    break
                default:
                    console.log('[ERROR] %s', err.message)
            }
            return false
        }
    }

    // Initial fetch
    if (!await fetchWebSocketUrl()) {
        console.log('[STATUS] Will retry in 10 seconds...')
        const retryInterval = setInterval(async () => {
            if (await fetchWebSocketUrl()) {
                clearInterval(retryInterval)
                connect()
            } else {
                console.log('[STATUS] Will retry in 10 seconds...')
            }
        }, 10000)
        return
    }

    // Send connection status to VRChat
    const sendConnectionHeartbeat = () => {
        try {
            // Check if we've received data recently (within last 30 seconds)
            const isReceivingData = lastDataTime !== null && (Date.now() - lastDataTime < 30000)

            const client = new Client('localhost', 9000)
            client.send({
                address: '/avatar/parameters/isHRConnected',
                args: { type: 'b', value: isReceivingData }
            })
        } catch (err) {
            // VRChat might not be running, that's okay
        }
    }

    // Check for data timeout
    const checkDataStatus = () => {
        if (lastDataTime === null) {
            noDataWarningCount++
            if (noDataWarningCount === 1) {
                console.log('[WARNING] No heart rate data received yet...')
                console.log('[INFO] Is your heart rate monitor active and connected to Pulsoid?')
            } else if (noDataWarningCount === 3) {
                console.log('[WARNING] Still no heart rate data after 30 seconds')
                console.log('[INFO] Check that:')
                console.log('[INFO]   1. Your heart rate monitor is worn and active')
                console.log('[INFO]   2. Pulsoid app shows your heart rate')
                console.log('[INFO]   3. The widget is connected to the right data source')
            } else if (noDataWarningCount % 6 === 0) {
                console.log('[WARNING] No heart rate data for %d seconds', noDataWarningCount * 10)
            }
            return
        }

        const timeSinceLastData = Date.now() - lastDataTime
        if (timeSinceLastData > 30000) {
            console.log('[WARNING] Heart rate stopped! No data for %d seconds', Math.round(timeSinceLastData / 1000))
            console.log('[INFO] Heart rate monitor may have disconnected')
        }
    }

    // Send disconnect status
    const sendDisconnectStatus = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        if (dataCheckInterval) clearInterval(dataCheckInterval)
        heartbeatInterval = null
        dataCheckInterval = null
        try {
            const client = new Client('localhost', 9000)
            client.send({
                address: '/avatar/parameters/isHRConnected',
                args: { type: 'b', value: false }
            })
            console.log('[STATUS] Sent disconnect status: isHRConnected = false')
        } catch (err) {
            // VRChat might not be running
        }
    }

    // Connect to WebSocket
    const connect = () => {
        if (!wsUrl) {
            console.log('[ERROR] No WebSocket URL available')
            return
        }

        console.log('[STATUS] Connecting to Pulsoid WebSocket...')

        try {
            ws = new WebSocket(wsUrl)
        } catch (err) {
            console.log('[ERROR] Failed to create WebSocket: %s', err.message)
            scheduleReconnect()
            return
        }

        ws.on('open', () => {
            console.log('[STATUS] Connected to Pulsoid!')
            console.log('[STATUS] Sending OSC to VRChat at localhost:9000')
            console.log('[STATUS] Waiting for heart rate data...')

            reconnectAttempts = 0
            noDataWarningCount = 0

            // Start heartbeat intervals
            heartbeatInterval = setInterval(sendConnectionHeartbeat, 5000)
            dataCheckInterval = setInterval(checkDataStatus, 10000)
            sendConnectionHeartbeat()
        })

        ws.on('message', (data) => {
            let parsed
            try {
                parsed = JSON.parse(data.toString())
            } catch (error) {
                console.log('[ERROR] Failed to parse data: %s', data.toString().substring(0, 100))
                return
            }

            // Handle different response formats
            const heartRate = parsed?.data?.heart_rate || parsed?.data?.heartRate || parsed?.heartRate

            if (!heartRate || heartRate === 0) {
                // Only log occasionally to avoid spam
                if (!noDataWarningShown) {
                    console.log('[INFO] Received message but no heart rate value (monitor may be initializing)')
                    noDataWarningShown = true
                }
                return
            }

            // Reset data tracking
            lastDataTime = Date.now()
            noDataWarningShown = false
            noDataWarningCount = 0

            console.log('[HR] %d bpm', heartRate)

            try {
                const client = new Client('localhost', 9000)

                // Build OSC messages from config
                const messages = oscConfig.parameters.map(param => {
                    const state = { toggle: hbToggle }
                    let value = evaluateParameterValue(param, heartRate, state)

                    // Convert type to OSC type code
                    let oscType
                    if (param.type === 'int') {
                        oscType = 'i'
                        value = Math.round(value)
                    } else if (param.type === 'float') {
                        oscType = 'f'
                        value = parseFloat(value)
                    } else if (param.type === 'bool') {
                        oscType = 'b'
                        value = Boolean(value)
                    }

                    return {
                        address: param.address,
                        args: { type: oscType, value: value },
                        isToggle: param.value === 'toggle' // Only advanced mode can be toggle
                    }
                })

                // Send all messages
                messages.forEach(msg => {
                    client.send({ address: msg.address, args: msg.args })

                    // Toggle the state after sending if it's a toggle parameter
                    if (msg.isToggle) {
                        hbToggle = !hbToggle
                    }
                })
            } catch (err) {
                // VRChat might not be running, that's okay
            }
        })

        ws.on('close', (code, reason) => {
            const reasonStr = reason?.toString() || 'unknown'
            console.log('[STATUS] WebSocket closed (code: %d, reason: %s)', code, reasonStr)
            sendDisconnectStatus()
            scheduleReconnect()
        })

        ws.on('error', (err) => {
            if (err.message.includes('401') || err.message.includes('403')) {
                console.log('[ERROR] Authentication failed - widget token may have expired')
                console.log('[INFO] Fetching new WebSocket URL...')
                wsUrl = null
                fetchWebSocketUrl().then(success => {
                    if (success) scheduleReconnect()
                })
            } else if (err.message.includes('ENOTFOUND') || err.message.includes('ENETUNREACH')) {
                console.log('[ERROR] Network error - cannot reach Pulsoid servers')
            } else {
                console.log('[ERROR] WebSocket error: %s', err.message)
            }
        })
    }

    // Schedule reconnection with backoff
    const scheduleReconnect = () => {
        reconnectAttempts++
        const delay = Math.min(5000 * reconnectAttempts, 30000) // Max 30 seconds
        console.log('[STATUS] Reconnecting in %d seconds... (attempt %d)', delay / 1000, reconnectAttempts)
        setTimeout(() => {
            if (wsUrl) {
                connect()
            } else {
                fetchWebSocketUrl().then(success => {
                    if (success) connect()
                })
            }
        }, delay)
    }

    // Start connection
    connect()

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n[STATUS] Shutting down...')
        sendDisconnectStatus()
        if (ws) ws.close()
        setTimeout(() => process.exit(0), 100)
    })

    process.on('SIGTERM', () => {
        console.log('[STATUS] Received termination signal, shutting down...')
        sendDisconnectStatus()
        if (ws) ws.close()
        setTimeout(() => process.exit(0), 100)
    })
}

exports.RunWidget = RunWidget
