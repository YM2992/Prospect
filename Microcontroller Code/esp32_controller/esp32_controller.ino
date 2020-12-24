// ESP32 microcontroller code || Receives data from web server and relays to the arduino.

// Require the WiFi and HTTPClient libraries required
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiAP.h>

#include <Arduino_JSON.h>

#include <HardwareSerial.h>


// Declare credentials of target WAP to leech from
const char* WAPssid = "WiFi-6A10"; //"StyrocutWAP";
const char* WAPpassword = "05617159"; //"qwerty123";

// Declare credentials of LAN
const char* LANssid = "StyrocutLAN";
const char* LANpassword = "styr0cut1";

// Initialise WiFi server
WiFiServer server(80);


// Define Serial2 UART pins
#define RXD2 16
#define TXD2 17


// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
  delay(4000);
  WiFi.begin(WAPssid, WAPpassword);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }

  Serial.println(WiFi.localIP());
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    http.begin("http://192.168.1.107:8080/MCInstructions");
    int httpCode = http.GET();
    
    if (httpCode > 0) {
      String payload = http.getString();
      JSONVar payloadJSON = JSON.parse(payload);

      //Serial.println(payloadJSON);

      if (JSON.typeof(payloadJSON) == "undefined") {
        return;
      }

      if (int(payloadJSON[payloadJSON.keys()[1]]) == 1) {
        Serial.println(payloadJSON[payloadJSON.keys()[3]]);
        Serial2.println(payloadJSON[payloadJSON.keys()[3]]);
      }
    }

    if (Serial2.available()) {
      Serial.println(String(Serial2.readString()));
      Serial.println("Serial2 available");
    }
    
    http.end();
  }
  
  delay(1000);
}
