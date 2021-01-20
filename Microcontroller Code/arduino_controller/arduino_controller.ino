// Arduino microcontroller code || Receives data from ESP32 to control stepper motors

// Require the ArduinoJson libarary to allow for manipulation of JSON objects
#include <ArduinoJson.h>
#include <Stepper.h>

// Declare motors
#define steps 200
Stepper motorX(steps, 2, 3);
Stepper motorY(steps, 4, 5);
#define motorInterfaceType 1

// Runtime variables
int motorXPos;
int motorYPos;


// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(9600);
  motorX.setSpeed(100);
  motorY.setSpeed(100);
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  while (Serial.available()) {
    const String serialData = Serial.readString();
    const char* serialChar = serialData.c_str();
    StaticJsonDocument<(1024)> doc; // 1024 bytes | memory uses 6 bytes per character. e.g. 100chars = 600bytes
    deserializeJson(doc, serialChar);

    Serial.println("received");

    for (unsigned int point = 0; point < doc.size(); point++) {
      int x = doc[point][0];
      int y = doc[point][1];
      motorX.step(x);
      motorXPos += x;
      motorY.step(y);
      motorYPos += y;
    }

    Serial.println("next");
  }
}
