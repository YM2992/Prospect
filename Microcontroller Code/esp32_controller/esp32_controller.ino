// ESP32 microcontroller code || Receives data from web server and relays to the arduino.

// Include libraries into this project
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


// Declare credentials of the server
const char* WAPssid = "Prospect Server";
const char* WAPpassword = "635s7F*8";

// Declare ServerIP
String SvrIP = "192.168.137.1:8080";


// Initialise WiFi server on port 80
WiFiServer server(80);


// Runtime variables
bool chunkSend = true;
int chunkId = 0;


// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(115200);
  Myserial.begin(9600, SERIAL_8N1, RXD2, TXD2); // Begin serial connection with the Arduino
  delay(4000);
  WiFi.begin(WAPssid, WAPpassword); // Connect to the server

  while (WiFi.status() != WL_CONNECTED) { // Wait until the ESP32 has connected to the server
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }

  Serial.println(WiFi.localIP()); // Print the local IP for debug purposes
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  if (chunkSend) {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient httpActions; // Start a HTTPClient to process requests

      // Get the current action request from the server
      httpActions.begin("http://" + SvrIP + "/MCStatus"); // Connect to the Prospect API '/MCStatus'
      int httpACode = httpActions.GET(); // Send a GET request to the API
      if (httpACode > 0) {
        String httpAPload = httpActions.getString(); // Get data from the API
        JSONVar httpAPloadJSON = JSON.parse(httpAPload); // Parse the data into a JSON object

        if (JSON.typeof(httpAPloadJSON) == "undefined") { // If no data was able to be retrieved, return
          return;
        }

        //Serial.println(httpAPloadJSON);
        const char* actionRes = (const char*) httpAPloadJSON["action"]; // See what the 'action' key of the retrieved data says
        Serial.println(actionRes);

        // Gets Z-Axis upper and lower bounds
        /*if (String(actionRes) != "tracing") {
          HTTPClient httpSpindle;
          httpSpindle.begin("http://" + SvrIP + "/SpindleSettings"); // Connect to Prospect API '/SpindleSettings'
          int httpSpinCode = httpSpindle.GET(); // Send a GET request to the API
          if (httpSpinCode > 0) {
            String httpSpindleLoad = httpSpindle.getString(); // Get data from the API
            JSONVar httpSpindleLoadJSON = JSON.parse(httpSpindleLoad); // Parse the data into a JSON object

            Serial.println(httpSpindleLoad);
            Serial.println(httpSpindleLoadJSON);
    
            if (JSON.typeof(httpSpindleLoadJSON) == "undefined") { // If no data was able to be retrieved, return
              return;
            }
    
            //const char* upperBound = (const char*) httpSpindleLoadJSON["upperTranslation"]; // See what the 'upperTranslation' key of the retrieved data says
            //const char* lowerBound = (const char*) httpSpindleLoadJSON["lowerTranslation"]; // See what the 'lowerTranslation' key of the retrieved data says
    
            Serial.print((const char*) httpSpindleLoadJSON["upperTranslation"]);
            Serial.print(",");
            Serial.println((const char*) httpSpindleLoadJSON["lowerTranslation"]);
            // Send the data to the Arduino via Serial communication
            Myserial.print((const char*) httpSpindleLoadJSON["upperTranslation"]);
            Myserial.print(",");
            Myserial.println((const char*) httpSpindleLoadJSON["lowerTranslation"]);
          }
        }*/

        if (String(actionRes) == "processing" or String(actionRes) == "processed") { // If the value of 'action' is "processing" or "processed", reset the 'chunkId' to 0 to signify a new activity
          chunkId = 0;

          Myserial.println(false); // Disable spindle rotation
        } else if (String(actionRes) == "tracing") { // If the value of 'action' is "tracing", begin retrieving and sending data from the server to the Arduino
          HTTPClient httpIns;

          // Get the cutting points from the server
          httpIns.begin("http://" + SvrIP + "/MCInstructions?id=" + String(chunkId));
          Serial.println(chunkId);
          int httpInsCode = httpIns.GET(); // Send a GET request to the API

          if (httpInsCode > 0) {
            String httpInsPload = httpIns.getString(); // Get data from the API
            JSONVar httpInsPloadJSON = JSON.parse(httpInsPload); // Parse the data into a JSON object

            if (JSON.typeof(httpInsPloadJSON) == "undefined") { // If no data was able to be retrieved, return
              return;
            }

            Serial.println(httpInsPloadJSON);
            Myserial.println(httpInsPloadJSON); // Send location instruction data to Arduino via serial

            Serial.println((const char*) httpAPloadJSON["spindleRotation"]);
            Myserial.println((const char*) httpAPloadJSON["spindleRotation"]); // Send spindle rotation bool to Arduino via serial
          } else {
            Myserial.println(false); // Disable spindle rotation
          }
          httpIns.end(); // End the HTTP request
        }
      }
      httpActions.end(); // End the HTTP request
    }
  }

  while (Myserial.available()) { // While the Arduino has something to say, read it
    String serialS = Myserial.readString(); // Read what the Arduino is saying
    serialS.trim(); // Remove any whitespaces from the Arduino's message
    if (serialS == "received") { // Arduino has said that it has received the data chunk
        chunkSend = false; // Pause chunk sending
    } else if (serialS == "next") { // Arduino is requesting the next data chunk
        chunkId++;
        chunkSend = true; // Resume chunk sending
    }
  }
  delay(1000);
}
