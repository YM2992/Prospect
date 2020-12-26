// Arduino microcontroller code || Receives data from ESP32 to control stepper motors

// Require the ArduinoJson libarary to allow for manipulation of JSON objects
#include <ArduinoJson.h>

// The setup function will run one time when the microcontroller starts
void setup() {
  Serial.begin(9600);
}

// The loop function will continually run as long as the microcontroller is alive
void loop() {
  while (Serial.available()) {
    const String serialData = Serial.readString();
    const char* serialChar = serialData.c_str();
    StaticJsonDocument<(1024)> doc; // 1024 bytes | memory uses 6 bytes per character. e.g. 100chars = 600bytes
    deserializeJson(doc, serialChar);

    for (unsigned int point = 0; point < doc.size(); point++) {
      int x = doc[point][0];
      int y = doc[point][1];
      Serial.print("x: ");
      Serial.print(x);
      Serial.print(" | y: ");
      Serial.println(y);
    }

    Serial.print("mem: ");
    Serial.println(doc.memoryUsage());
    Serial.print("ovflw: ");
    Serial.println(doc.overflowed());

    /*if (serialData.length() >= 4) {
      //Serial.print(serialData);
      StaticJsonDocument<(1024)> doc;
      deserializeJson(doc, serialData);
      JsonArray dataArray = doc.as<JsonArray>();

      Serial.print("points: {");
      for (JsonVariant v : dataArray) {
        Serial.println(v.as<String>());
      }
      Serial.println("}");

      Serial.print("mem: ");
      Serial.println(doc.memoryUsage());
      Serial.print("ovflw: ");
      Serial.println(doc.overflowed());

      }*/
  }
}
