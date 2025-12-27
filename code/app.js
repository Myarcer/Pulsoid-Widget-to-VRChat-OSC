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
    console.log('[INFO] Example: 004431a2-b446-410f-9f15-b25a77fe2c55')
    process.exit(1)
}

RunWidget(widgetId.trim())
