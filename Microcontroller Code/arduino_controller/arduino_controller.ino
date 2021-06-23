// Arduino microcontroller code || Receives data from ESP32 to control stepper motors

// Include libraries into this project
#include <ArduinoJson.h> // Require the ArduinoJson libarary to allow for manipulation of JSON objects
#include <Stepper.h> // Require the Stepper library to control the stepper motors

// Declare motors
#define steps 800
Stepper motorX(steps, 2, 3);
Stepper motorY(steps, 4, 5);
#define motorInterfaceType 1

Stepper motorZ = Stepper(2083, 8, 10, 9, 11);

// Runtime variables
int motorXPos = 0;
int motorXMax = 0;
int motorYPos = 0;
int motorYMax = 0;
int motorZPos = 0;
int motorZUpper = 0;
int motorZLower = 0;


// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(9600);

  motorX.setSpeed(100); // The RPM the motors spin at
  motorY.setSpeed(100);
  motorZ.setSpeed(100);

  pinMode(7, OUTPUT); // Declare spindle motor relay control pin
  digitalWrite(7, LOW); // Set the pin to LOW
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  while (Serial.available()) {
    const String serialData = Serial.readString();
    Serial.println(serialData);
    if (serialData.indexOf("[") > 0 || serialData.indexOf("]") > 0) {
      const char* serialChar = serialData.c_str(); // Converts from String to char*
      StaticJsonDocument<(1024)> doc; // 1024 bytes | memory uses 6 bytes per character. e.g. 100chars = 600bytes
      deserializeJson(doc, serialChar); // Convert the received data into a JSON format
  
      Serial.println("received"); // Tell the ESP32 that data has successfully been received
  
      for (int point = 0; point < doc.size(); point++) { // Loop through the points in the provided data array
        int x = doc[point][0];
        int y = doc[point][1];

        // x & y are equivalent to 
        x -= motorXPos;
        y -= motorYPos;

        // Move the motor to [x,y] and lower + raise the spindle
        motorX.step(x);
        motorY.step(y);
        motorZ.step(motorZLower);
        motorZ.step(motorZUpper);

        // Set the current position as [x,y]
        motorXPos += x;
        motorYPos += y;
      }
  
      Serial.println("next"); // Request the next chunk of data from the ESP32
    } else if (serialData == "true") {
      digitalWrite(7, HIGH);
    } else if (serialData == "false") {
      digitalWrite(7, LOW);
    } else if (isDigit(serialData.charAt(0)) && serialData.indexOf(",") > 0) {
      motorZUpper = serialData.substring(0, serialData.indexOf(",") - 1).toInt(); // Get the value before the comma separator (lower bound)
      motorZLower = serialData.substring(serialData.indexOf(",") + 1).toInt(); // Get the value after the comma seperator (upper bound)

      motorZ.step(motorZUpper);
      motorZ.step(motorZLower);
    }
  }
}
