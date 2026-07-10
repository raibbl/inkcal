// Diagnostic sketch - prints the raw state of every documented button
// pin so we can see exactly what's happening on the real hardware
// before trusting any of it in the main firmware. No display, no WiFi.

#define MENU_BUTTON 2
#define EXIT_BUTTON 1
#define DIAL_UP 6
#define DIAL_DOWN 4
#define DIAL_CONFIRM 5
#define BOOT_BUTTON 0
#define EPD_PWR 7

void setup() {
  Serial.begin(115200);
  delay(1500);

  pinMode(MENU_BUTTON, INPUT_PULLUP);
  pinMode(EXIT_BUTTON, INPUT_PULLUP);
  pinMode(DIAL_UP, INPUT_PULLUP);
  pinMode(DIAL_DOWN, INPUT_PULLUP);
  pinMode(DIAL_CONFIRM, INPUT_PULLUP);
  pinMode(BOOT_BUTTON, INPUT_PULLUP);
  pinMode(EPD_PWR, OUTPUT);
  digitalWrite(EPD_PWR, HIGH);

  Serial.println("Button diagnostic starting. Press each button and watch which value flips to 0.");
  Serial.println("MENU(2) EXIT(1) UP(6) DOWN(4) CONFIRM(5) BOOT(0)");
}

void loop() {
  Serial.printf(
    "MENU=%d EXIT=%d UP=%d DOWN=%d CONFIRM=%d BOOT=%d\n",
    digitalRead(MENU_BUTTON),
    digitalRead(EXIT_BUTTON),
    digitalRead(DIAL_UP),
    digitalRead(DIAL_DOWN),
    digitalRead(DIAL_CONFIRM),
    digitalRead(BOOT_BUTTON)
  );
  delay(300);
}
