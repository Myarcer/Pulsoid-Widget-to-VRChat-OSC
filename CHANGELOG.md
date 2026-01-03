# Changelog

## [1.1.0] - 2026-01-03

### Added
- Configurable OSC parameters via `osc_parameters.json`
- Simple mode: Easy range mapping with `outputRange` and optional `inputRange`
- Advanced mode: Custom math expressions and special keywords (`heartRate`, `toggle`, `connectionStatus`)
- Comprehensive parameter validation with helpful error messages
- In-file documentation with `_help` and `_examples` sections

### Fixed
- `isHRConnected` parameter now accurately reflects data reception (not just WebSocket connection)
- Only sends `true` when actually receiving HR data (30s grace period)

### Changed
- `isHRConnected` now fully configurable (can rename, disable, or add multiple connection status params)
- All OSC parameters now user-configurable instead of hardcoded

## [1.0.1] - Previous Release

Initial stable release with SteamVR autostart support.
