// Arduino microcontroller code || Receives data from ESP32 to control stepper motors

// Require the Arduino_JSON libarary
#include <Arduino_JSON.h>

// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(9600);
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  while (Serial.available()) {
    String serialData = Serial.readString();
    if (serialData.length() >= 4) {
      Serial.print(serialData);
    }
  }
}
