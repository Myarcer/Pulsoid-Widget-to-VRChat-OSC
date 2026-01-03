# OSC Parameters Configuration

Configure which OSC parameters are sent to VRChat and how they're calculated.

**Two modes:**
- **Simple Mode** - Range mapping with `outputRange` (beginner-friendly)
- **Advanced Mode** - Custom math with `value` (power users)

---

## Field Reference

### Required Fields (All Parameters)

**`name`** - Descriptive label for your reference (not sent to VRChat)

**`address`** - OSC path like `/avatar/parameters/YourParam` (must be unique)

**`type`** - Data type: `int` (whole numbers), `float` (decimals), or `bool` (true/false)

### Mode Selection (Choose One)

**Simple Mode:**
- **`outputRange`** - `[min, max]` array to map HR to your desired range
- **`inputRange`** - (Optional) `[min, max]` for your typical HR range. Default: `[0, 255]`

**Advanced Mode:**
- **`value`** - Math expression or special keyword

---

## Simple Mode Examples

Map HR (0-255 BPM) to a specific range:

```json
{
  "name": "HR",
  "address": "/avatar/parameters/HR",
  "type": "int",
  "outputRange": [0, 200]
}
```

**Common ranges:**
- `[0, 255]` - Full BPM range
- `[0, 200]` - Limit max to 200
- `[0.0, 1.0]` - For animations
- `[-1.0, 1.0]` - For blend shapes

Map your typical HR (60-180 BPM) to 0-1:

```json
{
  "name": "Normalized",
  "address": "/avatar/parameters/Normalized",
  "type": "float",
  "inputRange": [60, 180],
  "outputRange": [0.0, 1.0]
}
```

---

## Advanced Mode Examples

**Special keywords:**
- `heartRate` - Raw BPM value
- `toggle` - Alternates true/false each heartbeat (bool only)
- `connectionStatus` - True when receiving HR data, false when disconnected (bool only)

**Math operators:** `+` `-` `*` `/` `()`

**Examples:**

Raw BPM:
```json
{
  "name": "HR",
  "address": "/avatar/parameters/HR",
  "type": "int",
  "value": "heartRate"
}
```

Normalized to -1 to 1 (blend shapes):
```json
{
  "name": "Heartrate",
  "address": "/avatar/parameters/Heartrate",
  "type": "float",
  "value": "heartRate / 127 - 1"
}
```

Heartbeat toggle (pulsing effects):
```json
{
  "name": "HeartBeatToggle",
  "address": "/avatar/parameters/HeartBeatToggle",
  "type": "bool",
  "value": "toggle"
}
```

Connection status:
```json
{
  "name": "isHRConnected",
  "address": "/avatar/parameters/isHRConnected",
  "type": "bool",
  "value": "connectionStatus"
}
```

Custom formulas:
- `heartRate / 255` - Normalize to 0-1
- `(heartRate - 60) / 140` - Map 60-200 BPM to 0-1
- `heartRate * 2` - Double the value

---

## Editing Config

**Add parameter:** Add object to `parameters` array

**Remove parameter:** Delete object from array

**Change modes:** Can mix simple and advanced in same config

**Apply changes:** Restart application

---

## Error Messages

- **Invalid JSON** - Missing commas, brackets, or quotes
- **Must have either value or outputRange** - Choose one mode
- **Cannot use both value and outputRange** - Use only one mode per parameter
- **Address must start with /avatar/parameters/** - Fix address format
- **Duplicate address** - Each parameter needs unique address
- **Type must be one of: int, float, bool** - Use valid type
- **outputRange must be array with 2 numbers** - Format: `[min, max]`
- **outputRange min must be less than max** - Check your range
- **inputRange requires outputRange** - Can't use inputRange alone
- **Invalid value expression** - Use `heartRate`, `toggle`, `connectionStatus`, or valid math
- **connectionStatus can only be used with type bool** - Fix type

---

## Testing

1. Edit `osc_parameters.json`
2. Save
3. Restart application
4. Check logs:
   - ✅ `[INFO] Loaded X OSC parameter(s)` = Success
   - ❌ `[ERROR] Failed to load OSC configuration!` = Check error message

---

## Notes

- `_help` and `_examples` sections in config are ignored (for reference only)
- Changes require restart
- Mix simple and advanced modes freely
