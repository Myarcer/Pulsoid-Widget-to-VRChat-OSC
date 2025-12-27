const WebSocket = require('ws')
const { Client } = require('node-osc')

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

    // Validate widget ID format
    if (!isValidWidgetId(widgetId)) {
        console.log('[ERROR] Invalid widget ID format!')
        console.log('[INFO] Widget ID should be a UUID like: 004431a2-b446-410f-9f15-b25a77fe2c55')
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
            const client = new Client('localhost', 9000)
            client.send({
                address: '/avatar/parameters/isHRConnected',
                args: { type: 'b', value: true }
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

                const Heartrates = [
                    {
                        address: '/avatar/parameters/HR',
                        args: { type: "i", value: heartRate }
                    },
                    {
                        address: '/avatar/parameters/Heartrate',
                        args: { type: 'f', value: heartRate / 127 - 1 }
                    },
                    {
                        address: "/avatar/parameters/Heartrate2",
                        args: { type: "f", value: heartRate / 255 }
                    },
                    {
                        address: "/avatar/parameters/HeartBeatToggle",
                        args: { type: "b", value: hbToggle }
                    }
                ]

                Heartrates.forEach(element => {
                    client.send(element)
                    if (element.address === "/avatar/parameters/HeartBeatToggle") {
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
