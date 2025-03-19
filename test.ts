// deno run --allow-ffi --allow-read --allow-run test.ts
import * as Rpi from "./gpiopins.ts";

// This example turns on an LED connected to GPIO 18.
// The LED should be connected to a resistor and then to the GPIO pin.
// The GPIO pin should be configured as an output.
// The LED will turn on for 5 seconds and then turn off.

/**
 * Pauses the execution for a specified number of seconds.
 *
 * @param t The time in seconds to pause execution.
 */

async function sleep(t: number) {
  console.log(`Waiting for ${t} seconds...`);
  await new Promise((resolve) => setTimeout(resolve, t * 1000));
}

// Create a new GPIO chip object.
const chip = new Rpi.GpioChip("gpiochip0");
// Get the GPIO line for pin 18.
const gpio18 = chip.getLine(18);
// Configure the GPIO line as an output.
gpio18.requestOutput("my-test", Rpi.PinValue.Low);

// Turn on the LED.
gpio18.setValue(Rpi.PinValue.High);
console.log("LED:ON");

await sleep(5);
// Turn off the LED.
gpio18.setValue(Rpi.PinValue.Low);
console.log("LED:OFF");

// Release the GPIO line and close the GPIO chip.
gpio18.release();
chip.close();
