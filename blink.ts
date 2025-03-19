// deno run --allow-ffi --allow-read --allow-run blink.ts
import { GpioChip, PinValue } from "./gpiopins.ts";

// This example blinks an LED connected to GPIO 18.
// The LED should be connected to a resistor and then to the GPIO pin.
// The GPIO pin should be configured as an output.
// The LED will blink 8 times and then turn off.

// Create a new GPIO chip object.
const chip = new GpioChip("gpiochip0");

// Get the GPIO line for pin 18.
const gpio18 = chip.getLine(18);
// Configure the GPIO line as an output.
gpio18.requestOutput("my-blink-test");

let count = 8;

/**
 * Blinks an LED connected to GPIO 18.
 *
 * This function toggles the LED on and off 8 times, with each state lasting 1 second.
 * After the 8th toggle, it ensures the LED is turned off, releases the GPIO line,
 * and closes the GPIO chip.
 */

const blink = () => {
  if (count > 0) {
    gpio18.setValue(count-- % 2);
    setTimeout(blink, 1000);
  } else {
    if (gpio18.getValue() === PinValue.High) {
      console.log("The LED must be off");
      gpio18.setValue(PinValue.Low);
    }
    gpio18.release();
    chip.close();
  }
};

// Start the blinking sequence.
setTimeout(blink, 100);
