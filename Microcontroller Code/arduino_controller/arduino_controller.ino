// Arduino microcontroller code || Receives data from ESP32 to control stepper motors

// Require the ArduinoJson libarary to allow for manipulation of JSON objects
#include <ArduinoJson.h>
#include <Stepper.h>

// Declare motors
#define steps 800
Stepper motorX(steps, 2, 3);
Stepper motorY(steps, 4, 5);
#define motorInterfaceType 1

// Runtime variables
int motorXPos = 0;
int motorYPos = 0;
#define leadscrewMultiplier 50


// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(9600);

  motorX.setSpeed(100);
  motorY.setSpeed(100);

  pinMode(8, OUTPUT); // Declare heated wire relay control pin
  digitalWrite(8, LOW);
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  while (Serial.available()) {
    const String serialData = Serial.readString();
    // !! SIMULATION DATA !! const String serialData = "[[30,59],[30,60],[30,61],[31,28],[31,29],[31,30],[31,31],[32,61],[33,50],[34,50]]";
    const char* serialChar = serialData.c_str();
    StaticJsonDocument<(1024)> doc; // 1024 bytes | memory uses 6 bytes per character. e.g. 100chars = 600bytes
    deserializeJson(doc, serialChar);

    Serial.println("received"); // Tell the ESP32 that data has successfully been received

    for (int point = 0; point < doc.size(); point++) { // Loop through the points in the provided data array
      int x = doc[point][0];
      int y = doc[point][1];

      x -= motorXPos;
      y -= motorYPos;

      motorX.step(x * leadscrewMultiplier);
      motorY.step(y * leadscrewMultiplier);

      motorXPos += x;
      motorYPos += y;
    }

    Serial.println("next"); // Request the next chunk of data from the ESP32
  }
}
