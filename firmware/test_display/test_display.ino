// Minimal hardware sanity check for the CrowPanel 4.2" E-Paper (ESP32-S3).
// No WiFi, no secrets.h, no network - just confirms the display driver,
// SPI wiring, and Arduino IDE board setup all work before touching the
// full inkcal_display firmware.
//
// Requires only the "GxEPD2" library (Library Manager).

#include <GxEPD2_BW.h>

#define EPD_CS 45
#define EPD_DC 46
#define EPD_RST 47
#define EPD_BUSY 48
#define EPD_PWR 7

GxEPD2_BW<GxEPD2_420_GYE042A87, GxEPD2_420_GYE042A87::HEIGHT> display(
    GxEPD2_420_GYE042A87(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("inkcal test sketch starting...");

  pinMode(EPD_PWR, OUTPUT);
  digitalWrite(EPD_PWR, HIGH);

  display.init(115200);
  display.setRotation(0);

  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setCursor(20, 40);
    display.setTextSize(3);
    display.print("Hello, inkcal!");
    display.setCursor(20, 80);
    display.setTextSize(2);
    display.print("Display test OK");
  } while (display.nextPage());

  Serial.println("Draw complete - check the panel.");
}

void loop() {
  // one-shot test, nothing to repeat
}
