# OSC Parameters Configuration

The `osc_parameters.json` file allows you to customize which OSC parameters are sent to VRChat and how they're calculated.

**Two modes available:**
- **Simple Mode** (recommended for most users) - Easy range mapping with `outputRange`
- **Advanced Mode** - Custom math expressions with `value`

---

## Simple Mode (Easy Range Mapping)

Perfect for beginners! Just specify the output range you want.

### Basic Example
```json
{
  "name": "HR",
  "address": "/avatar/parameters/HR",
  "type": "int",
  "outputRange": [0, 200]
}
```
This maps heart rate (0-255 BPM) to 0-200 range.

### Custom Input Range Example
```json
{
  "name": "Normalized",
  "address": "/avatar/parameters/Normalized",
  "type": "float",
  "inputRange": [60, 180],
  "outputRange": [0.0, 1.0]
}
```
This maps 60-180 BPM to 0.0-1.0 range (values outside 60-180 are clamped).

### Simple Mode Fields

#### `outputRange` (array, required in simple mode)
Two numbers `[min, max]` defining the output range.

**Common ranges:**
- `[0, 255]` - Full BPM range as-is
- `[0, 200]` - Limit max to 200
- `[0.0, 1.0]` - Normalize to 0-1 (for animations)
- `[-1.0, 1.0]` - Normalize to -1 to 1 (for blend shapes)
- `[0, 100]` - Convert to percentage

#### `inputRange` (array, optional)
Two numbers `[min, max]` defining expected BPM range. Default: `[0, 255]`

**When to use:**
- You know your typical HR range (e.g., 60-180 BPM)
- Want better resolution in a specific range
- Need precise scaling

**Example:** `"inputRange": [50, 200]` treats 50 BPM as minimum, 200 as maximum

---

## Advanced Mode (Math Expressions)

For power users who need custom formulas.

### Example
```json
{
  "name": "Heartrate",
  "address": "/avatar/parameters/Heartrate",
  "type": "float",
  "value": "heartRate / 127 - 1"
}
```

### Advanced Mode Fields

#### `value` (string, required in advanced mode)
Math expression or special keyword.

**Special keywords:**
- `heartRate` - Raw BPM value (e.g., 75)
- `toggle` - Alternates true/false each heartbeat (bool only)
- `connectionStatus` - True when receiving HR data, false when disconnected (bool only)

**Math expressions:**
Use basic operators with `heartRate`:
- `+` Addition
- `-` Subtraction
- `*` Multiplication
- `/` Division
- `()` Parentheses

**Examples:**
- `heartRate / 255` - Normalize to 0-1
- `heartRate / 127 - 1` - Normalize to -1 to 1
- `(heartRate - 60) / 140` - Map 60-200 BPM to 0-1
- `heartRate * 2` - Double the value
- `heartRate / 2 + 50` - Half speed plus offset

---

## Common Fields (Both Modes)

### `name` (string, required)
Descriptive name for your reference (not sent to VRChat).

### `address` (string, required)
OSC address to send to. Must start with `/avatar/parameters/`

**Note:** Each parameter must have a unique address.

### `type` (string, required)
Data type for the parameter:
- `int` - Whole numbers (e.g., 75, 120, 200)
- `float` - Decimal numbers (e.g., 0.5, 1.234, -0.8)
- `bool` - True/false value

---

## Default Configuration

The default config uses both modes to show examples:

```json
{
  "parameters": [
    {
      "name": "HR",
      "address": "/avatar/parameters/HR",
      "type": "int",
      "outputRange": [0, 255]
    },
    {
      "name": "Heartrate",
      "address": "/avatar/parameters/Heartrate",
      "type": "float",
      "value": "heartRate / 127 - 1"
    },
    {
      "name": "Heartrate2",
      "address": "/avatar/parameters/Heartrate2",
      "type": "float",
      "outputRange": [0.0, 1.0]
    },
    {
      "name": "HeartBeatToggle",
      "address": "/avatar/parameters/HeartBeatToggle",
      "type": "bool",
      "value": "toggle"
    }
  ]
}
```

---

## Adding Parameters

Add a new object to the `parameters` array:

**Simple mode example:**
```json
{
  "name": "MyHR",
  "address": "/avatar/parameters/MyHR",
  "type": "float",
  "outputRange": [0.0, 2.0]
}
```

**Advanced mode example:**
```json
{
  "name": "CustomCalc",
  "address": "/avatar/parameters/CustomCalc",
  "type": "float",
  "value": "(heartRate - 60) / 100"
}
```

## Removing Parameters

Delete any parameter object you don't need from the array.

---

## Quick Reference

### Want to map HR to a specific range?
**Use Simple Mode:**
```json
{
  "name": "MyParam",
  "address": "/avatar/parameters/MyParam",
  "type": "float",
  "outputRange": [0.0, 1.0]
}
```

### Want HR within 60-180 BPM to map to 0-1?
**Use Simple Mode with inputRange:**
```json
{
  "name": "MyParam",
  "address": "/avatar/parameters/MyParam",
  "type": "float",
  "inputRange": [60, 180],
  "outputRange": [0.0, 1.0]
}
```

### Want a custom formula?
**Use Advanced Mode:**
```json
{
  "name": "MyParam",
  "address": "/avatar/parameters/MyParam",
  "type": "float",
  "value": "heartRate / 100 + 0.5"
}
```

### Want a toggle that alternates each heartbeat?
**Use Advanced Mode with toggle:**
```json
{
  "name": "MyToggle",
  "address": "/avatar/parameters/MyToggle",
  "type": "bool",
  "value": "toggle"
}
```

### Want to know when HR monitor is connected?
**Use Advanced Mode with connectionStatus:**
```json
{
  "name": "HRConnected",
  "address": "/avatar/parameters/HRConnected",
  "type": "bool",
  "value": "connectionStatus"
}
```

---

## Error Messages

Helpful validation errors on startup:

- **"Invalid JSON"** - Check for missing commas, brackets, or quotes
- **"Must have either value or outputRange"** - Choose simple or advanced mode
- **"Cannot use both value and outputRange"** - Use only one mode per parameter
- **"Address must start with /avatar/parameters/"** - Fix address format
- **"Duplicate address"** - Each parameter needs unique address
- **"Type must be one of: int, float, bool"** - Use valid type
- **"outputRange must be array with 2 numbers"** - Format: `[min, max]`
- **"outputRange min must be less than max"** - Check your range
- **"inputRange requires outputRange"** - Can't use inputRange alone
- **"Invalid value expression"** - Use `heartRate`, `toggle`, or valid math

## Testing Your Config

1. Edit `osc_parameters.json`
2. Save the file
3. Restart the application
4. Check startup logs:
   - ✅ `[INFO] Loaded X OSC parameter(s) from config` - Success!
   - ❌ `[ERROR] Failed to load OSC configuration!` - Check error message

---

## Notes

- The `_help` and `_examples` sections in the config file are ignored - keep them for reference or delete them
- Simple mode is recommended for most users
- Advanced mode gives you full control but requires understanding of the math
- You can mix both modes in the same config (some parameters simple, some advanced)
- Changes require restarting the application
