#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include "HX711.h"
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

static const char* TAG = "PashuMitra";

// WiFi Configuration
#ifndef WIFI_SSID
#define WIFI_SSID "Projects"
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "12345678@"
#endif
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// Firebase Configuration
#ifndef API_KEY
#define API_KEY "AIzaSyDSZPRVW4oiMqaNTuhvAM1NMJIirA2ALiM"
#endif
#ifndef DATABASE_URL
#define DATABASE_URL "https://pashu-mitra-897fa-default-rtdb.asia-southeast1.firebasedatabase.app/"
#endif
#ifndef FIREBASE_USER_EMAIL
#define FIREBASE_USER_EMAIL "venkatnvs2005@gmail.com"
#endif
#ifndef FIREBASE_USER_PASSWORD
#define FIREBASE_USER_PASSWORD "Venkat@2005"
#endif
const char* USER_EMAIL = FIREBASE_USER_EMAIL;
const char* USER_PASSWORD = FIREBASE_USER_PASSWORD;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// HX711 Scale Configuration
#define LOADCELL_DOUT_PIN  26
#define LOADCELL_SCK_PIN   27
#define CALIBRATION_FACTOR -463565.0
HX711 scale;

// Motor Control Pins (L298N)
#define MOTOR_PIN1 18
#define MOTOR_PIN2 19

// Servo Control
#define SERVO_PIN 5
Servo myServo;
int servoPosition = 70;

// Web Server
WebServer server(80);

// Global Variables
float currentWeight = 0.0;
String motorState = "STOPPED";
unsigned long lastStatusMs = 0;
const unsigned long statusIntervalMs = 2000; // Increased interval
unsigned long lastWifiCheckTime = 0;
const unsigned long wifiCheckInterval = 30000;
bool firebaseReady = false;
bool firebaseSignedIn = false;

// Function Declarations
void setupWiFi();
void setupFirebase();
void setupHardware();
void setupWebServer();
void checkWiFiConnection();
void updateScale();
void handleFirebaseCommands();
void publishStatus();
void handleRoot();
void handleData();
void handleMotor();
void handleServo();
void handleTare();
void controlMotor(const String& action);
void controlServo(const String& action);
static String jsonEscape(const String& input);

void setup() {
    Serial.begin(115200);
    
    // Wait for serial connection
    delay(2000);
    
    Serial.println("=== PashuMitra Feeder System Starting ===");
    Serial.printf("ESP32 Chip: %s\n", ESP.getChipModel());
    Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
    
    // Initialize hardware first
    setupHardware();
    setupWiFi();
    setupFirebase();
    setupWebServer();
    
    Serial.println("=== System Initialization Complete ===");
}

void loop() {
    // Handle web server requests
    server.handleClient();
    
    // Update scale reading
    updateScale();
    
    // Check WiFi connection periodically
    if (millis() - lastWifiCheckTime > wifiCheckInterval) {
        lastWifiCheckTime = millis();
        checkWiFiConnection();
    }
    
    // Handle Firebase operations only if connected
    if (WiFi.status() == WL_CONNECTED && firebaseReady) {
        publishStatus();
        handleFirebaseCommands();
    }
    
    delay(50);
}

void setupHardware() {
    Serial.println("Initializing hardware components...");
    
    // Initialize Scale
    scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare();
    Serial.println("HX711 scale initialized and tared");
    
    // Initialize Motor Pins
    pinMode(MOTOR_PIN1, OUTPUT);
    pinMode(MOTOR_PIN2, OUTPUT);
    digitalWrite(MOTOR_PIN1, LOW);
    digitalWrite(MOTOR_PIN2, LOW);
    Serial.println("Motor control pins initialized");
    
    // Initialize Servo
    myServo.attach(SERVO_PIN);
    myServo.write(servoPosition);
    Serial.printf("Servo initialized at position: %d°\n", servoPosition);
    
    Serial.println("Hardware initialization complete");
}

void setupWiFi() {
    Serial.printf("Connecting to WiFi: %s\n", ssid);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    unsigned long startAttemptTime = millis();
    int attemptCount = 0;
    
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
        delay(500);
        Serial.print(".");
        attemptCount++;
        
        if (attemptCount % 10 == 0) {
            Serial.printf("\nStill connecting... Attempt: %d\n", attemptCount);
        }
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("WiFi connected successfully!");
        Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("Signal Strength: %d dBm\n", WiFi.RSSI());
    } else {
        Serial.println("\nWiFi connection timeout. Continuing offline...");
    }
}

void setupFirebase() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Skipping Firebase setup - no WiFi connection");
        return;
    }
    
    Serial.println("Initializing Firebase...");
    
    // Assign the api key
    config.api_key = API_KEY;
    
    // Assign the RTDB URL
    config.database_url = DATABASE_URL;
    
    // Assign the user sign in credentials
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;
    
    // Assign the callback function for the long running token generation task
    config.token_status_callback = tokenStatusCallback;
    
    // Set reconnection policy
    Firebase.reconnectNetwork(true);
    
    // Begin Firebase with config and auth
    Firebase.begin(&config, &auth);
    
    // Wait for authentication
    Serial.println("Waiting for Firebase authentication...");
    unsigned long authStart = millis();
    
    while (!Firebase.ready() && millis() - authStart < 10000) {
        delay(100);
    }
    
    if (Firebase.ready()) {
        firebaseReady = true;
        firebaseSignedIn = true;
        Serial.println("Firebase initialized successfully");
        
        // Initialize command states
        Firebase.RTDB.setString(&fbdo, "/feeder/commands/motor", "idle");
        Firebase.RTDB.setString(&fbdo, "/feeder/commands/servo", "idle");
        Firebase.RTDB.setString(&fbdo, "/feeder/commands/tare", "idle");
        Serial.println("Firebase commands reset to idle");
    } else {
        Serial.println("Firebase initialization failed or timed out");
        firebaseReady = false;
    }
}

void setupWebServer() {
    Serial.println("Setting up web server...");
    
    server.on("/", handleRoot);
    server.on("/data", handleData);
    server.on("/motor", handleMotor);
    server.on("/servo", handleServo);
    server.on("/tare", handleTare);
    
    server.begin();
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("Web server started at: http://%s/\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("Web server started (offline mode)");
    }
}

void checkWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected. Attempting reconnection...");
        WiFi.disconnect();
        WiFi.begin(ssid, password);
        
        unsigned long startTime = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - startTime < 5000) {
            delay(100);
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf("WiFi reconnected: %s\n", WiFi.localIP().toString().c_str());
            
            // Try to reconnect Firebase if it was ready before
            if (!firebaseReady && firebaseSignedIn) {
                Firebase.reconnectNetwork(true);
                if (Firebase.ready()) {
                    firebaseReady = true;
                    Serial.println("Firebase reconnected");
                }
            }
        }
    }
}

void updateScale() {
    if (scale.is_ready()) {
        float newWeight = scale.get_units(3);
        
        // Only update if there's a significant change
        if (abs(newWeight - currentWeight) > 0.010) { // 10g threshold
            currentWeight = newWeight;
        }
    }
}

void publishStatus() {
    unsigned long now = millis();
    if (now - lastStatusMs > statusIntervalMs) {
        lastStatusMs = now;
        
        if (Firebase.ready()) {
            bool success = true;
            
            // Use individual writes with error checking
            if (!Firebase.RTDB.setFloat(&fbdo, "/feeder/status/weight", currentWeight)) {
                Serial.println("Failed to update weight");
                success = false;
            }
            
            if (!Firebase.RTDB.setString(&fbdo, "/feeder/status/motorState", motorState)) {
                Serial.println("Failed to update motor state");
                success = false;
            }
            
            if (!Firebase.RTDB.setInt(&fbdo, "/feeder/status/servoPosition", servoPosition)) {
                Serial.println("Failed to update servo position");
                success = false;
            }
            
            if (!Firebase.RTDB.setInt(&fbdo, "/feeder/status/updatedMs", now)) {
                Serial.println("Failed to update timestamp");
                success = false;
            }
            
            if (success) {
                Serial.printf("Status published: W=%.3fkg, M=%s, S=%d°\n", 
                        currentWeight, motorState.c_str(), servoPosition);
            } else {
                Serial.println("Some Firebase writes failed");
            }
        }
    }
}

void handleFirebaseCommands() {
    if (!Firebase.ready()) {
        return;
    }
    
    // Handle motor commands
    if (Firebase.RTDB.getString(&fbdo, "/feeder/commands/motor")) {
        String cmd = fbdo.stringData();
        if (cmd != "idle") {
            Serial.printf("Firebase motor command: %s\n", cmd.c_str());
            controlMotor(cmd);
            Firebase.RTDB.setString(&fbdo, "/feeder/commands/motor", "idle");
        }
    }
    
    // Handle servo commands
    if (Firebase.RTDB.getString(&fbdo, "/feeder/commands/servo")) {
        String cmd = fbdo.stringData();
        if (cmd != "idle") {
            Serial.printf("Firebase servo command: %s\n", cmd.c_str());
            controlServo(cmd);
            Firebase.RTDB.setString(&fbdo, "/feeder/commands/servo", "idle");
        }
    }

    // Handle tare command
    if (Firebase.RTDB.getString(&fbdo, "/feeder/commands/tare")) {
        String cmd = fbdo.stringData();
        if (cmd != "idle") {
            Serial.println("Firebase tare command received");
            scale.tare();
            currentWeight = 0.0;
            Firebase.RTDB.setString(&fbdo, "/feeder/commands/tare", "idle");
            Firebase.RTDB.setInt(&fbdo, "/feeder/status/lastTareMs", millis());
        }
    }
}

void controlMotor(const String& action) {
    Serial.printf("Motor control: %s\n", action.c_str());
    
    if (action == "forward") {
        digitalWrite(MOTOR_PIN1, HIGH);
        digitalWrite(MOTOR_PIN2, LOW);
        motorState = "FORWARD";
    } else if (action == "backward") {
        digitalWrite(MOTOR_PIN1, LOW);
        digitalWrite(MOTOR_PIN2, HIGH);
        motorState = "BACKWARD";
    } else if (action == "stop") {
        digitalWrite(MOTOR_PIN1, LOW);
        digitalWrite(MOTOR_PIN2, LOW);
        motorState = "STOPPED";
    } else {
        Serial.printf("Unknown motor action: %s\n", action.c_str());
        return;
    }
    
    Serial.printf("Motor state changed to: %s\n", motorState.c_str());
}

void controlServo(const String& action) {
    Serial.printf("Servo control: %s\n", action.c_str());
    
    if (action == "open") {
        servoPosition = 180;
        myServo.write(servoPosition);
        Serial.printf("Servo opened to: %d°\n", servoPosition);
    } else if (action == "close") {
        servoPosition = 70;
        myServo.write(servoPosition);
        Serial.printf("Servo closed to: %d°\n", servoPosition);
    } else {
        Serial.printf("Unknown servo action: %s\n", action.c_str());
    }
}

// Web Server Handlers
void handleRoot() {
    String html = "<!DOCTYPE html><html><head><title>PashuMitra Feeder Control</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>";
    html += "body{font-family:Arial,sans-serif;margin:20px;background:#f0f0f0;}";
    html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
    html += "h1{text-align:center;color:#333;margin-bottom:30px;}";
    html += ".section{margin:20px 0;padding:15px;border:1px solid #ddd;border-radius:8px;background:#fafafa;}";
    html += ".weight{font-size:2.5em;text-align:center;color:#007722;margin:15px 0;font-weight:bold;}";
    html += "button{background:#4CAF50;color:white;border:none;padding:12px 24px;margin:8px;border-radius:6px;cursor:pointer;font-size:16px;transition:background 0.3s;}";
    html += "button:hover{background:#45a049;transform:translateY(-1px);}";
    html += ".motor-btn{background:#2196F3;}";
    html += ".motor-btn:hover{background:#1976D2;}";
    html += ".servo-btn{background:#FF9800;}";
    html += ".servo-btn:hover{background:#F57C00;}";
    html += ".status{background:#e7e7e7;padding:12px;border-radius:6px;margin:10px 0;font-weight:bold;}";
    html += ".info{background:#e3f2fd;padding:10px;border-radius:6px;margin:10px 0;font-size:14px;}";
    html += "</style></head><body>";
    html += "<div class='container'>";
    html += "<h1>🐄 PashuMitra Feeder</h1>";
    
    // Connection status
    html += "<div class='info'>";
    html += String("WiFi: ") + (WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected") + " | ";
    html += String("Firebase: ") + (firebaseReady ? "Connected" : "Disconnected");
    html += "</div>";
    
    html += "<div class='section'>";
    html += "<h3>⚖️ Digital Scale</h3>";
    html += "<div class='weight' id='weight'>0.000 kg</div>";
    html += "<button onclick='tare()'>🔄 Zero Scale</button>";
    html += "</div>";
    
    html += "<div class='section'>";
    html += "<h3>⚙️ Motor Control</h3>";
    html += "<div class='status' id='motorStatus'>Motor: STOPPED</div>";
    html += "<button class='motor-btn' onclick='controlMotor(\"forward\")'>▶️ Forward</button>";
    html += "<button class='motor-btn' onclick='controlMotor(\"backward\")'>◀️ Backward</button>";
    html += "<button class='motor-btn' onclick='controlMotor(\"stop\")'>⏹️ Stop</button>";
    html += "</div>";
    
    html += "<div class='section'>";
    html += "<h3>🔧 Servo Control</h3>";
    html += "<div class='status' id='servoStatus'>Position: 70°</div>";
    html += "<button class='servo-btn' onclick='controlServo(\"open\")'>📖 Open</button>";
    html += "<button class='servo-btn' onclick='controlServo(\"close\")'>📕 Close</button>";
    html += "</div>";
    
    html += "</div>";
    
    html += "<script>";
    html += "setInterval(updateData, 1000);";
    html += "function updateData(){";
    html += "fetch('/data').then(response => response.json()).then(data => {";
    html += "document.getElementById('weight').innerText = data.weight.toFixed(3) + ' kg';";
    html += "document.getElementById('motorStatus').innerText = 'Motor: ' + data.motorState;";
    html += "document.getElementById('servoStatus').innerText = 'Position: ' + data.servoPosition + '°';";
    html += "}).catch(err => console.log('Update failed:', err));}";
    html += "function controlMotor(action){";
    html += "fetch('/motor?action=' + action).then(() => updateData()).catch(err => alert('Motor control failed: ' + err));}";
    html += "function controlServo(action){";
    html += "fetch('/servo?action=' + action).then(() => updateData()).catch(err => alert('Servo control failed: ' + err));}";
    html += "function tare(){";
    html += "fetch('/tare').then(() => {updateData(); alert('Scale zeroed successfully!');}).catch(err => alert('Tare failed: ' + err));}";
    html += "updateData();";
    html += "</script></body></html>";
    
    server.send(200, "text/html", html);
}

void handleData() {
    String json = "{";
    json += "\"weight\":" + String(currentWeight, 3) + ",";
    json += "\"motorState\":\"" + jsonEscape(motorState) + "\",";
    json += "\"servoPosition\":" + String(servoPosition) + ",";
    json += "\"wifiConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"firebaseReady\":" + String(firebaseReady ? "true" : "false");
    json += "}";
    
    server.send(200, "application/json", json);
}

static String jsonEscape(const String& input) {
    String out;
    out.reserve(input.length() + 8);
    for (size_t i = 0; i < input.length(); ++i) {
        char c = input.charAt(i);
        if (c == '"' || c == '\\') {
            out += '\\';
            out += c;
        } else {
            out += c;
        }
    }
    return out;
}

void handleMotor() {
    if (server.hasArg("action")) {
        String action = server.arg("action");
        Serial.printf("Web motor command: %s\n", action.c_str());
        controlMotor(action);
        server.send(200, "text/plain", "Motor command executed");
    } else {
        server.send(400, "text/plain", "Missing action parameter");
        Serial.println("Motor request missing action parameter");
    }
}

void handleServo() {
    if (server.hasArg("action")) {
        String action = server.arg("action");
        Serial.printf("Web servo command: %s\n", action.c_str());
        controlServo(action);
        server.send(200, "text/plain", "Servo command executed");
    } else {
        server.send(400, "text/plain", "Missing action parameter");
        Serial.println("Servo request missing action parameter");
    }
}

void handleTare() {
    Serial.println("Taring scale...");
    scale.tare();
    currentWeight = 0.0;
    if (Firebase.ready()) {
        Firebase.RTDB.setInt(&fbdo, "/feeder/status/lastTareMs", millis());
    }
    server.send(200, "text/plain", "Scale tared");
    Serial.println("Scale tared successfully");
}