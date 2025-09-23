#define TRIG1 D5
#define ECHO1 D6
#define TRIG2 D1
#define ECHO2 D2
#define RELAY D7

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
// Provide the token generation process info.
#include <addons/TokenHelper.h>

// Provide the RTDB payload printing info and other helper functions.
#include <addons/RTDBHelper.h>


#define WIFI_SSID "Projects"
#define WIFI_PASSWORD "12345678@"

#define API_KEY "AIzaSyDSZPRVW4oiMqaNTuhvAM1NMJIirA2ALiM"
#define DATABASE_URL "https://pashu-mitra-897fa-default-rtdb.asia-southeast1.firebasedatabase.app/" // RTDB URL

const char* USER_EMAIL = "venkatnvs2005@gmail.com";
const char* USER_PASSWORD = "Venkat@2005";

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
// Removed Preferences/config portal for this sketch

int TOTAL_HERD = 0;

const int threshold = 70;

unsigned long detectionTime1 = 0;
unsigned long detectionTime2 = 0;
int personCount = 0;
bool lightState = false;
unsigned long lastFetchHerdMs = 0;
const unsigned long fetchHerdIntervalMs = 5000; // poll every 5s

void setup() {
  Serial.begin(115200);

  pinMode(TRIG1, OUTPUT);
  pinMode(ECHO1, INPUT);
  pinMode(TRIG2, OUTPUT);
  pinMode(ECHO2, INPUT);
  pinMode(RELAY, OUTPUT);
  digitalWrite(RELAY, HIGH);

  Serial.println("Cattle Counter");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connect timeout. Continuing, Firebase will retry.");
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  config.token_status_callback = tokenStatusCallback;
  Firebase.reconnectNetwork(true);
  Firebase.begin(&config, &auth);
  int outsideCount = 0;
  if (TOTAL_HERD > 0) {
    outsideCount = max(TOTAL_HERD - personCount, 0);
  }
  int totalCount = (TOTAL_HERD > 0) ? TOTAL_HERD : (personCount + outsideCount);
  Firebase.setInt(fbdo, "/counters/cattle/inside", personCount);
  Firebase.setInt(fbdo, "/counters/cattle/outside", outsideCount);
  Firebase.setInt(fbdo, "/counters/cattle/total", totalCount);
  Firebase.setInt(fbdo, "/counters/cattle/lastDelta", 0);
}

void loop() {
  long dist1 = getDistance(TRIG1, ECHO1);
  long dist2 = getDistance(TRIG2, ECHO2);
  unsigned long now = millis();

  if (dist1 < threshold && (now - detectionTime1 > 1000)) {
    detectionTime1 = now;
    if (now - detectionTime2 < 1000) {
      personCount++;
      Serial.print("Cattle ENTERED. Count: ");
      Serial.println(personCount);
      turnLightOn();
      updateFirebase(1);
    }
  }

  if (dist2 < threshold && (now - detectionTime2 > 1000)) {
    detectionTime2 = now;
    if (now - detectionTime1 < 1000) {
      if (personCount > 0) {
        personCount--;
        Serial.print("Cattle EXITED. Count: ");
        Serial.println(personCount);
      }
      if (personCount == 0) {
        turnLightOff();
      }
      updateFirebase(-1);
    }
  }

  delay(100);

  if (Firebase.ready()) {
    unsigned long nowMs = millis();
    if (nowMs - lastFetchHerdMs > fetchHerdIntervalMs) {
      lastFetchHerdMs = nowMs;
      int herd = TOTAL_HERD;
      if (Firebase.getInt(fbdo, "/counters/cattle/totalHerd")) {
        herd = fbdo.to<int>();
        if (herd >= 0) TOTAL_HERD = herd;
      }
    }
  }
}

long getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  long distance = duration * 0.034 / 2;
  return (duration == 0) ? 999 : distance;
}

void turnLightOn() {
  lightState = true;
  digitalWrite(RELAY, LOW);
}

void turnLightOff() {
  lightState = false;
  digitalWrite(RELAY, HIGH);
}

void updateFirebase(int delta) {
  int outsideCount = 0;
  if (TOTAL_HERD > 0) {
    outsideCount = max(TOTAL_HERD - personCount, 0);
  }
  int totalCount = (TOTAL_HERD > 0) ? TOTAL_HERD : (personCount + outsideCount);

  Firebase.setInt(fbdo, "/counters/cattle/inside", personCount);
  Firebase.setInt(fbdo, "/counters/cattle/outside", outsideCount);
  Firebase.setInt(fbdo, "/counters/cattle/total", totalCount);
  Firebase.setInt(fbdo, "/counters/cattle/lastDelta", delta);
  Firebase.setInt(fbdo, "/counters/cattle/lastUpdatedMs", millis());
}