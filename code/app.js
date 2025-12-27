const { ReadFile, stringIsnullOrEmpty } = require('./method')
const { RunWidget } = require('./widget')

const widgetId = ReadFile('widget_id.txt')
if (stringIsnullOrEmpty(widgetId)) {
    console.log('========================================')
    console.log('  Pulsoid Widget to VRChat OSC')
    console.log('========================================')
    console.log('[ERROR] No widget_id.txt found!')
    console.log('[INFO] Create widget_id.txt with your Pulsoid widget ID')
    console.log('[INFO] Get it from: https://pulsoid.net/ui/widgets')
    console.log('[INFO] Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    process.exit(1)
}

RunWidget(widgetId.trim())
