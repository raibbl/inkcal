# inkcal

A desk e-ink calendar display: a Next.js server renders a calendar as a
bitmap, and custom ESP32 firmware polls it and pushes the image to a
physical e-paper screen.

[Live preview](https://inkcal-omega.vercel.app/) (the web view the server
renders — the physical device shows the same thing on e-paper)

## How it fits together

- **`app/`** — Next.js app. `app/api/calendar.bmp` renders the calendar as a
  1-bpp packed bitmap the display can draw directly; `app/api/phone-notification`
  handles the lightweight polling/notification check.
- **`firmware/`** — Arduino sketches for a CrowPanel ESP32-S3 4.2" e-paper
  board. `inkcal_display` is the real firmware; `button_diag` and
  `test_display` are diagnostic sketches used while bringing up the
  hardware. See [`firmware/README.md`](firmware/README.md) for Arduino IDE
  setup, wiring, and how the polling/refresh cycle works.

## Running the server locally

```bash
npm install
npm run dev
```

## Flashing the firmware

See [`firmware/README.md`](firmware/README.md) — in short: copy
`firmware/inkcal_display/secrets.h.example` to `secrets.h`, fill in WiFi
credentials and the deployed server URL, then flash from Arduino IDE.
`secrets.h` is gitignored and should never be committed.
