# Pulsoid Widget to VRChat OSC

A lightweight tool that sends your heart rate from Pulsoid to VRChat via OSC, using **widget-based authentication** - no token expiration!

> **Fork of [Sonic853/Pulsoid-to-VRChat-OSC](https://github.com/Sonic853/Pulsoid-to-VRChat-OSC)** with widget-based connection instead of API tokens.

## Why Widget Mode?

The original tool requires a Pulsoid API token which needs a **BRO subscription**. This fork uses your Pulsoid **widget URL** instead, which:
- ✅ **Free** - No BRO subscription required
- ✅ Never expires
- ✅ No reauthentication needed
- ✅ Works as long as your widget exists
- ✅ Automatic reconnection with smart error messages

## Quick Start

1. **Set up a heart rate monitor with Pulsoid**
   - See [Pulsoid Documentation](https://www.blog.pulsoid.net/monitors) for supported devices

2. **Get your Widget ID** from [pulsoid.net/ui/widgets](https://pulsoid.net/ui/widgets)
   - Your widget URL looks like: `https://pulsoid.net/widget/view/a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - The widget ID is the UUID part: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

3. **Edit `widget_id.txt`** and paste your widget ID

4. **Run `run.bat`** to start

## SteamVR Auto-Start

To register this app with SteamVR for automatic startup:

1. **Double-click `pulsoid_widget_osc.vrmanifest`** to register the addon with SteamVR
2. The app will now automatically launch when SteamVR starts

> **Note:** You can manage auto-start addons in SteamVR Settings → Startup/Shutdown → Manage Add-on Applications

## VRChat Avatar Parameters

The following OSC parameters are sent to `localhost:9000`:

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `HR` | int | 0-255 | Heart rate BPM (primary) |
| `isHRConnected` | bool | - | Connection status (updates every 5s) |
| `Heartrate` | float | -1 to 1 | For BPM counter display |
| `Heartrate2` | float | 0 to 1 | For animations/sounds |
| `HeartBeatToggle` | bool | - | Toggles with each heartbeat |

## Status Messages

The app provides clear status feedback:
- `[STATUS]` - Connection and startup info
- `[HR]` - Heart rate readings
- `[WARNING]` - No data or disconnection alerts
- `[ERROR]` - Connection failures with troubleshooting hints

## Requirements

- **Windows** (uses PowerShell for auto-setup)
- Pulsoid account with a widget
- VRChat with OSC enabled

> **Note:** Node.js is automatically downloaded on first run if not installed.

## Credits

- Original: [Sonic853/Pulsoid-to-VRChat-OSC](https://github.com/Sonic853/Pulsoid-to-VRChat-OSC)
- Widget mode implementation by Myarcer
