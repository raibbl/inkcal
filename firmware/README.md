# inkcal firmware (CrowPanel ESP32-S3 4.2" E-Paper)

## Arduino IDE setup

1. Install [Arduino IDE 2.x](https://www.arduino.cc/en/software).
2. **Boards Manager** -> install `esp32` by Espressif Systems.
3. Board: **ESP32S3 Dev Module**. Under Tools, set:
   - Flash Size: 8MB
   - PSRAM: OPI PSRAM
   - USB CDC On Boot: Enabled (needed to see Serial output over the native USB port)
4. **Library Manager** -> install:
   - `GxEPD2` (e-paper driver)
   - `ArduinoJson` (parsing the `?format=json` change-check response)
   - `Preferences` ships with the ESP32 core - no separate install needed.

## Configure

```
cd firmware/inkcal_display
cp secrets.h.example secrets.h
```

Edit `secrets.h` with your WiFi credentials, your deployed server URL, and
the same `ESP32_SECRET_KEY` value configured on the server. `secrets.h` is
gitignored - never commit it.

## Flash

Open `inkcal_display.ino` in Arduino IDE, select the board's serial port,
and upload.

## How it behaves

The board is USB-powered on a desk, so there's no deep sleep - it just
polls on a timer:

- Every **15 minutes**, it fetches `/api/calendar.bmp?format=raw` (a plain
  packed 1-bpp bitmap, no file header) and does a full e-paper refresh.
- Every **2 minutes**, it fetches the much cheaper `?format=json` and
  compares just the notification/event fields against the last check
  (ignoring the current-time fields, which change every request). If
  something actually changed, it triggers an early full refresh instead
  of waiting out the 15-minute cycle.

Both intervals are plain constants at the top of the `.ino` file - change
them if you want a different cadence. Full e-paper refreshes visibly
flash the panel and have a finite rated cycle count, so avoid polling
much more often than this without a reason.

## Buttons

- **MENU** (GPIO2): forces an immediate refresh, showing a "Refreshing..."
  screen first so it's obvious the press registered.
- **Dial Up/Down** (GPIO6/GPIO4): cycles through the server's themes
  (`classic`, `bigDate`, `newspaper`, `ticket`, `chips` - must match
  `themeNames` in `lib/themes.tsx`), saving the choice to flash (NVS)
  via `Preferences` so it survives a reboot or the **RESET** button.
- **EXIT** and the dial's **Confirm** aren't wired to anything yet.
- **RESET** is a hardware reset tied directly to the chip's EN pin - it's
  not firmware-controlled, it just reboots the board like a power cycle.

## If the display looks inverted

`drawBitmap(..., GxEPD_BLACK)` assumes bit=1 means "draw black". If your
panel shows a photographic negative of the calendar, swap that call for
the commented-out `drawInvertedBitmap(...)` line right below it in
`drawBitmapToDisplay()`.
