// ESP32 microcontroller code || Receives data from web server and relays to the arduino.

// Require the WiFi and HTTPClient libraries required
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiAP.h>

#include <Arduino_JSON.h>


// Include the HardwareSerial library to use Serial2 UART pins
#include <HardwareSerial.h>
HardwareSerial Myserial(2);

// Define Serial2 UART pins
#define RXD2 16
#define TXD2 17


// Declare credentials of target WAP to leech from
const char* WAPssid = "WiFi-6A10"; //"StyrocutWAP";
const char* WAPpassword = "05617159"; //"qwerty123";

// Declare credentials of LAN
const char* LANssid = "StyrocutLAN";
const char* LANpassword = "styr0cut1";

// Initialise WiFi server on port 80
WiFiServer server(80);


// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(115200);
  Myserial.begin(9600, SERIAL_8N1, RXD2, TXD2);
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
        Myserial.println(payloadJSON[payloadJSON.keys()[3]]);
      }
    }
    http.end();
  }

  while (Myserial.available()) {
    Serial.println(Myserial.readString());
    Serial.println("Serial2 available");
  }
  delay(1000);
}
