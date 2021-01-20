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


// Runtime variables
bool chunkSend = true;
int chunkId = 0;


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
  if (chunkSend) {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient httpActions;
      httpActions.begin("http://192.168.1.107:8080/MCActions");
      int httpACode = httpActions.GET();
      if (httpACode > 0) {
        String httpAPload = httpActions.getString();
        JSONVar httpAPloadJSON = JSON.parse(httpAPload);

        //Serial.println(httpAPloadJSON);
        const char* actionRes = (const char*) httpAPloadJSON["action"];
        //Serial.println(actionRes);


        if (JSON.typeof(httpAPloadJSON) == "undefined") {
          return;
        }

        if (String(actionRes) == "cutting") {
          HTTPClient httpIns;

          httpIns.begin("http://192.168.1.107:8080/MCInstructions?id=" + String(chunkId));
          //Serial.println(chunkId);
          int httpInsCode = httpIns.GET();

          if (httpInsCode > 0) {
            String httpInsPload = httpIns.getString();
            JSONVar httpInsPloadJSON = JSON.parse(httpInsPload);

            if (JSON.typeof(httpInsPloadJSON) == "undefined") {
              return;
            }

            Serial.println(httpInsPloadJSON);
            Myserial.println(httpInsPloadJSON);
          }
          httpIns.end();
        }
      }
      httpActions.end();
    }
  }

  while (Myserial.available()) {
    String serialS = Myserial.readString();
    serialS.trim();
    if (serialS == "received") {
        chunkSend = false;
    } else if (serialS == "next") {
        chunkId++;
        chunkSend = true;
    }
  }
  delay(1000);
}
