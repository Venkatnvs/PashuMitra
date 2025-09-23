#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>
#include "HX711.h"
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

static const char* TAG = "PashuMitra";

// WiFi Configuration (can be overridden via build flags or secrets header)
#ifndef WIFI_SSID
#define WIFI_SSID "Projects"
#endif
#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "12345678@"
#endif
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// Firebase Configuration (override with -DAPI_KEY=..., etc.)
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
int servoPosition = 70;   // Initial servo angle

// Web Server
WebServer server(80);

// Global Variables
float currentWeight = 0.0;
String motorState = "STOPPED";
unsigned long lastStatusMs = 0;
const unsigned long statusIntervalMs = 1000; // Status update interval (reduced log volume)
unsigned long lastWifiCheckTime = 0;
const unsigned long wifiCheckInterval = 30000; // WiFi check interval
bool firebaseReady = false;

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
    while (!Serial && millis() < 3000) {
        delay(100);
    }
    
    ESP_LOGI(TAG, "=== PashuMitra Feeder System Starting ===");
    ESP_LOGI(TAG, "ESP32 Chip: %s", ESP.getChipModel());
    ESP_LOGI(TAG, "Free Heap: %d bytes", ESP.getFreeHeap());
    
    // setupHardware();
    setupWiFi();
    setupFirebase();
    setupWebServer();
    
    ESP_LOGI(TAG, "=== System Initialization Complete ===");
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
    
    // Handle Firebase operations
    if (WiFi.status() == WL_CONNECTED && Firebase.ready()) {
        if (!firebaseReady) {
            firebaseReady = true;
            ESP_LOGI(TAG, "Firebase connection established");
        }
        
        publishStatus();
        handleFirebaseCommands();
    } else if (firebaseReady) {
        firebaseReady = false;
        ESP_LOGW(TAG, "Firebase connection lost");
    }
    
    delay(50); // Small delay to prevent WDT issues
}

void setupHardware() {
    ESP_LOGI(TAG, "Initializing hardware components...");
    
    // Initialize Scale
    scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare();
    ESP_LOGI(TAG, "HX711 scale initialized and tared");
    
    // Initialize Motor Pins
    pinMode(MOTOR_PIN1, OUTPUT);
    pinMode(MOTOR_PIN2, OUTPUT);
    digitalWrite(MOTOR_PIN1, LOW);
    digitalWrite(MOTOR_PIN2, LOW);
    ESP_LOGI(TAG, "Motor control pins initialized");
    
    // Initialize Servo
    myServo.attach(SERVO_PIN);
    myServo.write(servoPosition);
    ESP_LOGI(TAG, "Servo initialized at position: %d°", servoPosition);
    
    ESP_LOGI(TAG, "Hardware initialization complete");
}

void setupWiFi() {
    ESP_LOGI(TAG, "Connecting to WiFi: %s", ssid);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    unsigned long startAttemptTime = millis();
    int attemptCount = 0;
    
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
        delay(500);
        Serial.print(".");
        attemptCount++;
        
        if (attemptCount % 10 == 0) {
            ESP_LOGI(TAG, "Still connecting... Attempt: %d", attemptCount);
        }
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        ESP_LOGI(TAG, "WiFi connected successfully!");
        ESP_LOGI(TAG, "IP Address: %s", WiFi.localIP().toString().c_str());
        ESP_LOGI(TAG, "Signal Strength: %d dBm", WiFi.RSSI());
    } else {
        ESP_LOGW(TAG, "WiFi connection timeout. Continuing offline...");
    }
}

void setupFirebase() {
    if (WiFi.status() != WL_CONNECTED) {
        ESP_LOGW(TAG, "Skipping Firebase setup - no WiFi connection");
        return;
    }
    
    ESP_LOGI(TAG, "Initializing Firebase...");
    
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;
    config.token_status_callback = tokenStatusCallback;
    
    Firebase.reconnectNetwork(true);
    Firebase.begin(&config, &auth);
    
    // Initialize command states
    if (Firebase.ready()) {
        Firebase.RTDB.setString(&fbdo, "/feeder/commands/motor", "idle");
        Firebase.RTDB.setString(&fbdo, "/feeder/commands/servo", "idle");
        Firebase.RTDB.setString(&fbdo, "/feeder/commands/tare", "idle");
        ESP_LOGI(TAG, "Firebase initialized - commands reset to idle");
    } else {
        ESP_LOGW(TAG, "Firebase initialization pending...");
    }
}

void setupWebServer() {
    ESP_LOGI(TAG, "Setting up web server...");
    
    server.on("/", handleRoot);
    server.on("/data", handleData);
    server.on("/motor", handleMotor);
    server.on("/servo", handleServo);
    server.on("/tare", handleTare);
    
    server.begin();
    
    if (WiFi.status() == WL_CONNECTED) {
        ESP_LOGI(TAG, "Web server started at: http://%s/", WiFi.localIP().toString().c_str());
    } else {
        ESP_LOGI(TAG, "Web server started (offline mode)");
    }
}

void checkWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        ESP_LOGW(TAG, "WiFi disconnected. Attempting reconnection...");
        WiFi.disconnect();
        WiFi.begin(ssid, password);
        
        // Wait a short time for reconnection
        unsigned long startTime = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - startTime < 5000) {
            delay(100);
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            ESP_LOGI(TAG, "WiFi reconnected: %s", WiFi.localIP().toString().c_str());
        }
    }
}

void updateScale() {
    if (scale.is_ready()) {
        float newWeight = scale.get_units(3);
        
        // Only log significant weight changes to reduce spam
        if (abs(newWeight - currentWeight) > 0.010) { // 10g threshold
            ESP_LOGD(TAG, "Weight updated: %.3f kg", newWeight);
        }
        
        currentWeight = newWeight;
    }
}

void publishStatus() {
    unsigned long now = millis();
    if (now - lastStatusMs > statusIntervalMs) {
        lastStatusMs = now;
        
        bool success = true;
        success &= Firebase.RTDB.setFloat(&fbdo, "/feeder/status/weight", currentWeight);
        success &= Firebase.RTDB.setString(&fbdo, "/feeder/status/motorState", motorState);
        success &= Firebase.RTDB.setInt(&fbdo, "/feeder/status/servoPosition", servoPosition);
        success &= Firebase.RTDB.setInt(&fbdo, "/feeder/status/updatedMs", now);
        
        if (success) {
            ESP_LOGD(TAG, "Status published: W=%.3fkg, M=%s, S=%d°", 
                    currentWeight, motorState.c_str(), servoPosition);
        } else {
            ESP_LOGW(TAG, "Failed to publish status to Firebase");
        }
    }
}

void handleFirebaseCommands() {
    // Handle motor commands
    if (Firebase.RTDB.getString(&fbdo, "/feeder/commands/motor")) {
        String cmd = fbdo.stringData();
        if (cmd != "idle") {
            ESP_LOGI(TAG, "Firebase motor command: %s", cmd.c_str());
            controlMotor(cmd);
            Firebase.RTDB.setString(&fbdo, "/feeder/commands/motor", "idle");
        }
    }
    
    // Handle servo commands
    if (Firebase.RTDB.getString(&fbdo, "/feeder/commands/servo")) {
        String cmd = fbdo.stringData();
        if (cmd != "idle") {
            ESP_LOGI(TAG, "Firebase servo command: %s", cmd.c_str());
            controlServo(cmd);
            Firebase.RTDB.setString(&fbdo, "/feeder/commands/servo", "idle");
        }
    }

    // Handle tare command
    if (Firebase.RTDB.getString(&fbdo, "/feeder/commands/tare")) {
        String cmd = fbdo.stringData();
        if (cmd != "idle") {
            ESP_LOGI(TAG, "Firebase tare command received");
            scale.tare();
            currentWeight = 0.0;
            Firebase.RTDB.setString(&fbdo, "/feeder/commands/tare", "idle");
            // Record last tare time
            Firebase.RTDB.setInt(&fbdo, "/feeder/status/lastTareMs", millis());
        }
    }
}

void controlMotor(const String& action) {
    ESP_LOGI(TAG, "Motor control: %s", action.c_str());
    
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
        ESP_LOGW(TAG, "Unknown motor action: %s", action.c_str());
        return;
    }
    
    ESP_LOGI(TAG, "Motor state changed to: %s", motorState.c_str());
}

void controlServo(const String& action) {
    ESP_LOGI(TAG, "Servo control: %s", action.c_str());
    
    if (action == "open") {
        servoPosition = 180;
        myServo.write(servoPosition);
        ESP_LOGI(TAG, "Servo opened to: %d°", servoPosition);
    } else if (action == "close") {
        servoPosition = 70;
        myServo.write(servoPosition);
        ESP_LOGI(TAG, "Servo closed to: %d°", servoPosition);
    } else {
        ESP_LOGW(TAG, "Unknown servo action: %s", action.c_str());
    }
}

// Web Server Handlers
void handleRoot() {
    ESP_LOGD(TAG, "Serving web interface to client: %s", server.client().remoteIP().toString().c_str());
    
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
    html += "<div style='margin-top:8px'>";
    html += "<button onclick='tare()'>🔄 Zero Scale</button>";
    html += "</div>";
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
    ESP_LOGD(TAG, "Data request served");
}

// Minimal JSON string escaper for quotes and backslashes
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
        ESP_LOGI(TAG, "Web motor command: %s", action.c_str());
        controlMotor(action);
        server.send(200, "text/plain", "Motor command executed");
    } else {
        server.send(400, "text/plain", "Missing action parameter");
        ESP_LOGW(TAG, "Motor request missing action parameter");
    }
}

void handleServo() {
    if (server.hasArg("action")) {
        String action = server.arg("action");
        ESP_LOGI(TAG, "Web servo command: %s", action.c_str());
        controlServo(action);
        server.send(200, "text/plain", "Servo command executed");
    } else {
        server.send(400, "text/plain", "Missing action parameter");
        ESP_LOGW(TAG, "Servo request missing action parameter");
    }
}

void handleTare() {
    ESP_LOGI(TAG, "Taring scale...");
    scale.tare();
    currentWeight = 0.0;
    if (Firebase.ready()) {
        Firebase.RTDB.setInt(&fbdo, "/feeder/status/lastTareMs", millis());
    }
    server.send(200, "text/plain", "Scale tared");
    ESP_LOGI(TAG, "Scale tared successfully");
}