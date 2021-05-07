// Arduino microcontroller code || Receives data from ESP32 to control stepper motors

// Include libraries into this project
#include <ArduinoJson.h> // Require the ArduinoJson libarary to allow for manipulation of JSON objects
#include <Stepper.h> // Require the Stepper library to control the stepper motors

// Declare motors
#define steps 800
Stepper motorX(steps, 2, 3);
Stepper motorY(steps, 4, 5);
#define motorInterfaceType 1

// Runtime variables
int motorXPos = 0;
int motorXMax = 0;
int motorYPos = 0;
int motorYMax = 0;
#define leadscrewMultiplier 50


// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(9600);

  motorX.setSpeed(100);
  motorY.setSpeed(100);

  pinMode(8, OUTPUT); // Declare spindle motor relay control pin
  digitalWrite(8, LOW); // Set the pin to LOW
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  while (Serial.available()) {
    const String serialData = Serial.readString();
    if (serialData.indexOf("[") > 0 || serialData.indexOf("]") > 0) {
      // !! SIMULATION DATA !! const String serialData = "[[30,59],[30,60],[30,61],[31,28],[31,29],[31,30],[31,31],[32,61],[33,50],[34,50]]";
      const char* serialChar = serialData.c_str();
      StaticJsonDocument<(1024)> doc; // 1024 bytes | memory uses 6 bytes per character. e.g. 100chars = 600bytes
      deserializeJson(doc, serialChar); // Conver the received data into a JSON format
  
      Serial.println("received"); // Tell the ESP32 that data has successfully been received
  
      for (int point = 0; point < doc.size(); point++) { // Loop through the points in the provided data array
        int x = doc[point][0];
        int y = doc[point][1];

        // x & y are equivalent to 
        x -= motorXPos;
        y -= motorYPos;

        // Move the motor to [x,y]
        motorX.step(x * leadscrewMultiplier);
        motorY.step(y * leadscrewMultiplier);

        // Set the current position as [x,y]
        motorXPos += x;
        motorYPos += y;
      }
  
      Serial.println("next"); // Request the next chunk of data from the ESP32
    } else {
      if (serialData == "locateMax") {
        // Repetitively increment steps until the max limit has been achieved
        while (digitalRead(9) == "LOW") {
          motorX.step(1);
          motorXMax += 1;
          delay(50);
        }
        while (digitalRead(10) == "LOW") {
          motorY.step(1);
          motorYMax += 1;
          delay(50);
        }

        // Return to home [0,0]
        motorX.step(-motorXMax);
        motorY.step(-motorYMax);
      }
    }
  }
}
