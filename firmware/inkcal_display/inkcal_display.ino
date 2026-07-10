#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <GxEPD2_BW.h>
#include <Preferences.h>
#include "secrets.h"

// CrowPanel 4.2" E-Paper (ESP32-S3, SSD1683)
#define EPD_CS 45
#define EPD_DC 46
#define EPD_RST 47
#define EPD_BUSY 48
#define EPD_PWR 7

// Onboard buttons - all active-LOW with internal pullup (pressed = LOW).
// MENU forces an immediate refresh; the dial's Up/Down cycle themes.
// EXIT and the dial's Confirm aren't used yet.
#define MENU_BUTTON 2
#define DIAL_UP 6
#define DIAL_DOWN 4
const unsigned long BUTTON_DEBOUNCE_MS = 50;

// Must match the theme names registered in lib/themes.tsx on the server.
const char* THEME_NAMES[] = { "classic", "bigDate", "newspaper", "ticket", "chips" };
const int THEME_COUNT = sizeof(THEME_NAMES) / sizeof(THEME_NAMES[0]);

Preferences preferences;
int currentThemeIndex = 0;

GxEPD2_BW<GxEPD2_420_GYE042A87, GxEPD2_420_GYE042A87::HEIGHT> display(
    GxEPD2_420_GYE042A87(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

const int DISPLAY_WIDTH = 400;
const int DISPLAY_HEIGHT = 300;
const size_t BITMAP_SIZE = (DISPLAY_WIDTH / 8) * DISPLAY_HEIGHT; // 15000 bytes, no header/padding

uint8_t bitmap[BITMAP_SIZE];

// Board is always USB-powered, so no deep sleep - just poll on a timer.
// Full redraws flash the panel and wear it over many cycles, so they're
// spaced out; a cheap JSON check runs more often just to catch a new SMS
// notification sooner, without forcing a visible refresh every time.
const unsigned long REFRESH_INTERVAL_MS = 15UL * 60UL * 1000UL;
const unsigned long NOTIFICATION_CHECK_INTERVAL_MS = 2UL * 60UL * 1000UL;

unsigned long lastFullRefresh = 0;
unsigned long lastNotificationCheck = 0;
String lastSignature = "";

struct Button {
  uint8_t pin;
  bool lastReading = HIGH;
  unsigned long lastChangeTime = 0;
};

Button menuButton = { MENU_BUTTON };
Button dialUpButton = { DIAL_UP };
Button dialDownButton = { DIAL_DOWN };

bool buttonPressed(Button& button, unsigned long now) {
  bool reading = digitalRead(button.pin);
  bool pressed = false;

  if (reading != button.lastReading) {
    button.lastChangeTime = now;
  }
  if (now - button.lastChangeTime > BUTTON_DEBOUNCE_MS && reading == LOW && button.lastReading == HIGH) {
    pressed = true;
  }

  button.lastReading = reading;
  return pressed;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");
}

bool httpGet(const String& path, WiFiClientSecure& client, HTTPClient& http) {
  client.setInsecure(); // trusted, fixed host you control - fine to skip cert pinning
  http.begin(client, String(SERVER_URL) + path + "&theme=" + THEME_NAMES[currentThemeIndex]);
  http.addHeader("Authorization", String("Bearer ") + ESP32_SECRET_KEY);
  return http.GET() == 200;
}

bool fetchBitmap() {
  WiFiClientSecure client;
  HTTPClient http;

  if (!httpGet("/api/calendar.bmp?format=raw", client, http)) {
    Serial.println("Bitmap fetch failed");
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  size_t received = 0;
  unsigned long start = millis();
  while (received < BITMAP_SIZE && millis() - start < 15000) {
    if (stream->available()) {
      received += stream->readBytes(bitmap + received, BITMAP_SIZE - received);
    }
  }
  http.end();

  if (received != BITMAP_SIZE) {
    Serial.printf("Incomplete bitmap: %u/%u bytes\n", received, BITMAP_SIZE);
    return false;
  }
  return true;
}

// Builds a signature from just the fields that mean something changed
// (notification, event list) - deliberately excludes headerTime/
// subheaderText, which change every request just from the clock ticking.
String fetchChangeSignature() {
  WiFiClientSecure client;
  HTTPClient http;

  if (!httpGet("/api/calendar.bmp?format=json", client, http)) {
    http.end();
    return "";
  }

  String body = http.getString();
  http.end();

  DynamicJsonDocument doc(4096);
  if (deserializeJson(doc, body)) return "";

  String sig;
  if (!doc["notification"].isNull()) {
    sig += doc["notification"]["sender"].as<String>();
    sig += "|";
    sig += doc["notification"]["message"].as<String>();
    sig += "|";
    sig += doc["notification"]["receivedAt"].as<String>();
  }
  sig += "#";
  for (JsonObject event : doc["events"].as<JsonArray>()) {
    sig += event["time"].as<String>();
    sig += event["title"].as<String>();
    sig += ";";
  }
  return sig;
}

void drawBitmapToDisplay() {
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.drawBitmap(0, 0, bitmap, DISPLAY_WIDTH, DISPLAY_HEIGHT, GxEPD_BLACK);
    // If black/white come out swapped on your panel, use this instead:
    // display.drawInvertedBitmap(0, 0, bitmap, DISPLAY_WIDTH, DISPLAY_HEIGHT, GxEPD_BLACK);
  } while (display.nextPage());
}

void showRefreshingScreen() {
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setCursor(20, 150);
    display.setTextSize(3);
    display.print("Refreshing...");
  } while (display.nextPage());
}

void forceRefresh(unsigned long now) {
  if (fetchBitmap()) {
    drawBitmapToDisplay();
  }
  lastSignature = fetchChangeSignature();
  lastFullRefresh = now;
  lastNotificationCheck = now;
}

void switchTheme(int delta, unsigned long now) {
  currentThemeIndex = (currentThemeIndex + delta + THEME_COUNT) % THEME_COUNT;
  preferences.putUInt("theme", currentThemeIndex);
  Serial.printf("Switched to theme: %s\n", THEME_NAMES[currentThemeIndex]);
  showRefreshingScreen();
  forceRefresh(now);
}

void setup() {
  Serial.begin(115200);
  pinMode(EPD_PWR, OUTPUT);
  digitalWrite(EPD_PWR, HIGH);
  pinMode(MENU_BUTTON, INPUT_PULLUP);
  pinMode(DIAL_UP, INPUT_PULLUP);
  pinMode(DIAL_DOWN, INPUT_PULLUP);

  preferences.begin("inkcal", false);
  currentThemeIndex = preferences.getUInt("theme", 0) % THEME_COUNT;

  connectWiFi();

  display.init(115200);
  display.setRotation(0);

  forceRefresh(millis());
}

void loop() {
  unsigned long now = millis();

  if (buttonPressed(menuButton, now)) {
    Serial.println("MENU button pressed - forcing refresh");
    showRefreshingScreen();
    forceRefresh(now);
    return;
  }

  if (buttonPressed(dialUpButton, now)) {
    switchTheme(1, now);
    return;
  }

  if (buttonPressed(dialDownButton, now)) {
    switchTheme(-1, now);
    return;
  }

  if (now - lastFullRefresh >= REFRESH_INTERVAL_MS) {
    forceRefresh(now);
    return;
  }

  if (now - lastNotificationCheck >= NOTIFICATION_CHECK_INTERVAL_MS) {
    String signature = fetchChangeSignature();
    if (signature.length() > 0 && signature != lastSignature) {
      lastSignature = signature;
      if (fetchBitmap()) {
        drawBitmapToDisplay();
      }
    }
    lastNotificationCheck = now;
  }
}
