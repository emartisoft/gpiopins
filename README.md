# gpiopins

A module in Deno that uses FFI (Foreign Function Interface) to call the
`libgpiod.so` library, enabling control of GPIO (General Purpose Input/Output)
pins exclusively on systems running Linux (such as Raspberry Pi OS).

## Requirements / Dependencies

- Deno 1.28+
- Linux systems with GPIO pins (Raspberry PI OS gibi)
- libgpiod

```console
sudo apt install gpiod libgpiod-dev
```

## Usage

#### Deno

```console
deno add jsr:@emarti/gpiopins
```

### Modul Tests

```console
deno run --allow-ffi --allow-read --allow-run test.ts

deno task pin18
deno task test
deno task blink
```

### Examples (Tested on Raspberry PI 4)

#### test.ts

```ts
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
```

```console
deno run --allow-ffi --allow-read --allow-run test.ts
```

#### blink.ts

```ts
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
```

```console
deno run --allow-ffi --allow-read --allow-run blink.ts
```
