# Om Chakra Device — Bluetooth LE protocol (v1)

The Om app drives a 7-channel vibration device over **Bluetooth Low Energy** (Web Bluetooth).
The **app does all sequencing**; the device only executes the commands below. Firmware is on hold —
this document is the contract it must implement.

## Advertising

- Device name: starts with **`Om`** (e.g. `Om Chakra Device`) — the app filters on this prefix.
- Primary service UUID: **`6f6d0001-6368-616b-7261-2d6f6d646576`**

## Characteristics

| Name | UUID | Properties | Direction |
|---|---|---|---|
| Control | `6f6d0002-6368-616b-7261-2d6f6d646576` | Write Without Response (Write also accepted) | app → device |
| Status | `6f6d0003-6368-616b-7261-2d6f6d646576` | Notify, Read | device → app |
| Battery (optional) | standard Battery Service `0x180F` / Level `0x2A19` | Read, Notify | device → app |

## Channels

| Channel | Chakra |
|---|---|
| 1 | Muladhara (root) |
| 2 | Svadhisthana |
| 3 | Manipura |
| 4 | Anahata |
| 5 | Vishuddha |
| 6 | Ajna |
| 7 | Sahasrara (crown) |
| `0xFF` | all channels (STOP only) |

## Control commands (little-endian)

| Op | Bytes | Meaning |
|---|---|---|
| `0x01` PLAY | `01 ch freqLo freqHi intensity durLo durHi` (7 B) | Vibrate `ch` at `freq` Hz (10–100, uint16) with `intensity` 0–255 for `dur` ms (uint16), then stop by itself |
| `0x02` STOP | `02 ch` (2 B) | Stop channel `ch`; `ch = 0xFF` stops all immediately |
| `0x03` HOLD | `03 ch freqLo freqHi intensity` (5 B) | Vibrate `ch` continuously until STOP; re-sending HOLD updates frequency/intensity live |
| `0x04` PING | `04` (1 B) | Device answers with a Status notification |

Several channels may run at once (the app's "All together" mode sends one HOLD per channel).
Firmware should drive each actuator with a sine at `freq` (tactile transducers) or, for ERM coin
motors, pulse on/off at `freq` with duty proportional to `intensity`.

**Safety:** firmware must stop all channels if the BLE connection drops, and cap any single
vibration at 10 minutes even without a STOP.

## Status notification

`statusVersion(=1) activeMask battery` (3 B)

- `activeMask`: bit `n-1` set when channel `n` is vibrating.
- `battery`: 0–100 %, or `0xFF` if unknown.
