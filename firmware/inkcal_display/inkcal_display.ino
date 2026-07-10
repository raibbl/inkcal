#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <GxEPD2_BW.h>
#include "secrets.h"

// CrowPanel 4.2" E-Paper (ESP32-S3, SSD1683)
#define EPD_CS 45
#define EPD_DC 46
#define EPD_RST 47
#define EPD_BUSY 48
#define EPD_PWR 7

// Onboard MENU button - active-LOW with internal pullup (pressed = LOW)
#define MENU_BUTTON 2
const unsigned long BUTTON_DEBOUNCE_MS = 50;

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

bool lastButtonReading = HIGH;
unsigned long lastButtonChangeTime = 0;

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
  http.begin(client, String(SERVER_URL) + path);
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

void setup() {
  Serial.begin(115200);
  pinMode(EPD_PWR, OUTPUT);
  digitalWrite(EPD_PWR, HIGH);
  pinMode(MENU_BUTTON, INPUT_PULLUP);

  connectWiFi();

  display.init(115200);
  display.setRotation(0);

  forceRefresh(millis());
}

void loop() {
  unsigned long now = millis();

  bool buttonReading = digitalRead(MENU_BUTTON);
  if (buttonReading != lastButtonReading) {
    lastButtonChangeTime = now;
  }
  if (now - lastButtonChangeTime > BUTTON_DEBOUNCE_MS && buttonReading == LOW && lastButtonReading == HIGH) {
    Serial.println("MENU button pressed - forcing refresh");
    showRefreshingScreen();
    forceRefresh(now);
    lastButtonReading = buttonReading;
    return;
  }
  lastButtonReading = buttonReading;

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
