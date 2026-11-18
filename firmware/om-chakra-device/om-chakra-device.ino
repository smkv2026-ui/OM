/*
 * Om Chakra Device — firmware for an ESP32 driving 7 vibration pads (one per chakra)
 * via 4 × DRV8833 dual H-bridges, controlled over Bluetooth LE by the Om app.
 * Protocol: docs/DEVICE_PROTOCOL.md (v1). The app does all sequencing; this only executes commands.
 *
 * Board:     ESP32 Dev Module (ESP32-WROOM-32 DevKit)
 * Core:      Arduino-ESP32 3.x (Boards Manager: "esp32" by Espressif Systems)
 * Library:   NimBLE-Arduino 1.4.x by h2zero (Library Manager)
 *
 * NOTE: written to the protocol and tested in the app with a simulated device; not yet run on
 * real hardware. Follow the bench test in the setup guide before strapping it on.
 */
#include <Arduino.h>
#include <NimBLEDevice.h>

/* ------------------------------------------------------------------ settings */

// Actuator type: 1 = tactile transducers (true sine at the set frequency),
//                0 = ERM coin motors (pulsed on/off at the set frequency).
#define ACTUATOR_TRANSDUCER 1

// Maximum drive (0–1023) at 100 % intensity. Lower this if pads are too strong or drivers get hot.
#define MAX_DUTY 900

#define DEVICE_NAME "Om Chakra Device"
#define OM_SERVICE "6f6d0001-6368-616b-7261-2d6f6d646576"
#define OM_CONTROL "6f6d0002-6368-616b-7261-2d6f6d646576"
#define OM_STATUS "6f6d0003-6368-616b-7261-2d6f6d646576"

// Pin map: channel n (1 = Muladhara … 7 = Sahasrara) → DRV8833 inputs (IN_A, IN_B).
//   Driver 1: AIN1/AIN2 = ch1, BIN1/BIN2 = ch2      Driver 2: ch3, ch4
//   Driver 3: ch5, ch6                               Driver 4: AIN = ch7 (B unused)
static const uint8_t PIN_A[7] = {13, 16, 18, 21, 23, 26, 32};
static const uint8_t PIN_B[7] = {14, 17, 19, 22, 25, 27, 33};
static const uint8_t PIN_SLEEP = 4;   // all four DRV8833 nSLEEP pins tied together
static const uint8_t PIN_LED = 2;     // on-board LED: blinks while advertising, solid when connected

static const uint32_t PWM_CARRIER_HZ = 20000;  // above hearing
static const uint8_t PWM_BITS = 10;            // duty 0–1023
static const uint32_t MAX_RUN_MS = 10UL * 60UL * 1000UL;  // safety cap per vibration

/* ------------------------------------------------------------------ channel state */

struct Channel {
  volatile bool on = false;
  volatile float freq = 10;        // Hz, 10–100
  volatile float level = 0;        // 0–1
  volatile uint32_t stopAt = 0;    // millis(); 0 = until STOP (still capped by MAX_RUN_MS)
  volatile uint32_t startedAt = 0;
  float phase = 0;                 // 0–1, owned by the drive task
};
static Channel ch[7];
static portMUX_TYPE chMux = portMUX_INITIALIZER_UNLOCKED;

static NimBLECharacteristic *statusChar = nullptr;
static volatile bool connected = false;
static volatile bool statusDirty = true;

static uint8_t activeMask() {
  uint8_t m = 0;
  for (int i = 0; i < 7; i++) if (ch[i].on) m |= (1 << i);
  return m;
}

static void startChannel(int i, uint16_t freq, uint8_t intensity, uint32_t durMs) {
  portENTER_CRITICAL(&chMux);
  ch[i].freq = constrain(freq, 10, 100);
  ch[i].level = intensity / 255.0f;
  ch[i].startedAt = millis();
  ch[i].stopAt = durMs ? millis() + durMs : 0;
  ch[i].on = intensity > 0;
  portEXIT_CRITICAL(&chMux);
  statusDirty = true;
}

static void stopChannel(int i) {
  portENTER_CRITICAL(&chMux);
  ch[i].on = false;
  portEXIT_CRITICAL(&chMux);
  ledcWrite(PIN_A[i], 0);
  ledcWrite(PIN_B[i], 0);
  statusDirty = true;
}

static void stopAll() {
  for (int i = 0; i < 7; i++) stopChannel(i);
}

/* ------------------------------------------------------------------ command parser (protocol v1) */

static void handleCommand(const uint8_t *b, size_t n) {
  if (n < 1) return;
  switch (b[0]) {
    case 0x01: {  // PLAY ch freqLo freqHi intensity durLo durHi
      if (n < 7 || b[1] < 1 || b[1] > 7) return;
      startChannel(b[1] - 1, b[2] | (b[3] << 8), b[4], b[5] | (b[6] << 8));
      break;
    }
    case 0x02: {  // STOP ch | 0xFF = all
      if (n < 2) return;
      if (b[1] == 0xFF) stopAll();
      else if (b[1] >= 1 && b[1] <= 7) stopChannel(b[1] - 1);
      break;
    }
    case 0x03: {  // HOLD ch freqLo freqHi intensity (continuous; re-send to retune)
      if (n < 5 || b[1] < 1 || b[1] > 7) return;
      startChannel(b[1] - 1, b[2] | (b[3] << 8), b[4], 0);
      break;
    }
    case 0x04:  // PING
      statusDirty = true;
      break;
  }
}

class ControlCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic *c) override {
    std::string v = c->getValue();
    handleCommand(reinterpret_cast<const uint8_t *>(v.data()), v.size());
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer *) override {
    connected = true;
    statusDirty = true;
  }
  void onDisconnect(NimBLEServer *) override {
    connected = false;
    stopAll();  // safety: nothing keeps vibrating without the app
    NimBLEDevice::startAdvertising();
  }
};

/* ------------------------------------------------------------------ drive task (sine / pulse synthesis) */

static void driveTask(void *) {
  const float dt = 0.001f;  // 1 kHz update — 10+ samples per cycle at 100 Hz
  for (;;) {
    uint32_t now = millis();
    for (int i = 0; i < 7; i++) {
      Channel &c = ch[i];
      if (!c.on) continue;
      if ((c.stopAt && (int32_t)(now - c.stopAt) >= 0) || now - c.startedAt > MAX_RUN_MS) {
        stopChannel(i);
        continue;
      }
      c.phase += c.freq * dt;
      if (c.phase >= 1) c.phase -= 1;
#if ACTUATOR_TRANSDUCER
      // bipolar sine: positive half drives IN_A, negative half drives IN_B
      float s = sinf(2 * PI * c.phase);
      uint32_t duty = (uint32_t)(fabsf(s) * c.level * MAX_DUTY);
      ledcWrite(PIN_A[i], s >= 0 ? duty : 0);
      ledcWrite(PIN_B[i], s < 0 ? duty : 0);
#else
      // ERM: on for the first part of each cycle (longer at higher intensity), one direction only
      bool onPart = c.phase < (0.25f + 0.6f * c.level);
      ledcWrite(PIN_A[i], onPart ? (uint32_t)(MAX_DUTY * (0.5f + 0.5f * c.level)) : 0);
      ledcWrite(PIN_B[i], 0);
#endif
    }
    vTaskDelay(1);
  }
}

/* ------------------------------------------------------------------ setup / loop */

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_SLEEP, OUTPUT);
  digitalWrite(PIN_SLEEP, HIGH);  // wake all DRV8833s
  for (int i = 0; i < 7; i++) {
    ledcAttach(PIN_A[i], PWM_CARRIER_HZ, PWM_BITS);
    ledcAttach(PIN_B[i], PWM_CARRIER_HZ, PWM_BITS);
    ledcWrite(PIN_A[i], 0);
    ledcWrite(PIN_B[i], 0);
  }

  NimBLEDevice::init(DEVICE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P6);
  NimBLEServer *server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService *svc = server->createService(OM_SERVICE);
  NimBLECharacteristic *control = svc->createCharacteristic(OM_CONTROL, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  control->setCallbacks(new ControlCallbacks());
  statusChar = svc->createCharacteristic(OM_STATUS, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  svc->start();
  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(OM_SERVICE);
  adv->setScanResponse(true);
  NimBLEDevice::startAdvertising();

  xTaskCreatePinnedToCore(driveTask, "drive", 4096, nullptr, 2, nullptr, 1);
  Serial.println("Om Chakra Device ready — advertising as \"" DEVICE_NAME "\"");
}

void loop() {
  static uint32_t lastBlink = 0, lastStatus = 0;
  uint32_t now = millis();
  if (connected) digitalWrite(PIN_LED, HIGH);
  else if (now - lastBlink > 500) {
    lastBlink = now;
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  // status notification: on change, and every 2 s while connected
  if (statusChar && connected && (statusDirty || now - lastStatus > 2000)) {
    statusDirty = false;
    lastStatus = now;
    uint8_t s[3] = {1, activeMask(), 0xFF /* battery unknown */};
    statusChar->setValue(s, 3);
    statusChar->notify();
  }
  // Serial test commands for the bench test: "t1".."t7" = 1 s pulse at 40 Hz, 60 %; "s" = stop all
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "s") stopAll();
    else if (cmd.length() == 2 && cmd[0] == 't' && cmd[1] >= '1' && cmd[1] <= '7') {
      startChannel(cmd[1] - '1', 40, 153, 1000);
      Serial.printf("Pulse on channel %c\n", cmd[1]);
    }
  }
  delay(5);
}
