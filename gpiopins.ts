/**
 * Converts a JavaScript string to a null-terminated C string.
 *
 * @param s The string to convert.
 *
 * @returns A `Uint8Array` containing the null-terminated C string.
 */
function stringToCString(s: string): Uint8Array {
  return new TextEncoder().encode(s + "\0");
}

const libPath = "libgpiod.so";

const symbols: Record<string, Deno.ForeignFunction> = {
  "gpiod_chip_open_by_name": {
    parameters: ["buffer" as const],
    result: "pointer" as const,
  },
  "gpiod_chip_get_line": {
    parameters: ["pointer" as const, "u32" as const],
    result: "pointer" as const,
  },
  "gpiod_line_request_output": {
    parameters: ["pointer" as const, "buffer" as const, "i32" as const],
    result: "i32" as const,
  },
  "gpiod_line_request_input": {
    parameters: ["pointer" as const, "buffer" as const],
    result: "i32" as const,
  },
  "gpiod_line_get_value": {
    parameters: ["pointer" as const],
    result: "i32" as const,
  },
  "gpiod_line_set_value": {
    parameters: ["pointer" as const, "i32" as const],
    result: "i32" as const,
  },
  "gpiod_line_release": {
    parameters: ["pointer" as const],
    result: "void" as const,
  },
  "gpiod_chip_close": {
    parameters: ["pointer" as const],
    result: "void" as const,
  },
};

const lib = Deno.dlopen(libPath, symbols);

/**
 * Enum representing the possible values for a GPIO pin.
 */
export enum PinValue {
  High = 1,
  Low = 0,
}

/**
 * Type representing the possible values for a GPIO pin.
 */
export type PinValueType = PinValue.High | PinValue.Low;

/**
 * Retrieves the names of available GPIO chips on the system.
 *
 * This function executes the `gpiodetect` command to list the available
 * GPIO chips, parses the output, and returns an array of chip names.
 *
 * @returns An array of strings representing the names of the available GPIO chips.
 *          If the `gpiodetect` command fails, an empty array is returned.
 */

function getGpioChipNames(): string[] {
  const cmd = new Deno.Command("gpiodetect", {
    stdout: "piped",
    stderr: "piped",
  });

  const { success, stdout, stderr } = cmd.outputSync();

  if (!success) {
    const errorOutput = new TextDecoder().decode(stderr);
    console.error("gpiodetect command failed to execute.", errorOutput);
    return [];
  }

  const output = new TextDecoder().decode(stdout);

  const lines = output.trim().split("\n");

  const chipNames = lines.map((line) => {
    const [chipName] = line.split(" ", 1);
    return chipName;
  });

  return chipNames;
}

/**
 * Represents a GPIO chip on the system.
 */
export class GpioChip {
  private chipPtr: bigint;

  /**
   * Constructs a new GpioChip object.
   *
   * @param chipName The name of the GPIO chip to open. If not provided, the
   *                 default name "gpiochip0" is used.
   *
   * @throws If the specified GPIO chip name is not valid, an error is thrown.
   */
  constructor(public chipName: string = "gpiochip0") {
    const chipNames = getGpioChipNames();
    if (!chipNames.includes(chipName)) {
      console.log("Available GPIO chip names:", chipNames);
      throw new Error(
        `Could not open GPIO chip '${chipName}'. Please enter a valid GPIO chip name.`,
      );
    }
    const chipNameBuf = stringToCString(chipName);
    this.chipPtr = lib.symbols.gpiod_chip_open_by_name(
      chipNameBuf,
    ) as unknown as bigint;
  }

  /**
   * Retrieves a GPIO line object from the GPIO chip.
   *
   * @param gpioPin The GPIO pin number to acquire.
   *
   * @throws If the GPIO line could not be acquired, an error is thrown.
   *
   * @returns A GpioLine object representing the GPIO line.
   */
  getLine(gpioPin: number): GpioLine {
    const linePtr = lib.symbols.gpiod_chip_get_line(this.chipPtr, gpioPin);
    if (linePtr === 0n) {
      throw new Error(`Failed to acquire GPIO line (gpioPin: ${gpioPin}).`);
    }
    return new GpioLine(linePtr as bigint);
  }

  /**
   * Closes the GPIO chip, releasing the resources associated with it.
   */

  close(): void {
    lib.symbols.gpiod_chip_close(this.chipPtr);
  }
}

/**
 * Represents a GPIO line on a GPIO chip.
 */
export class GpioLine {
  /**
   * Constructs a new GpioLine object.
   *
   * @param linePtr The pointer to the GPIO line.
   */
  constructor(private linePtr: bigint) {}

  /**
   * Requests the GPIO line as an output with the specified default value.
   *
   * @param consumer The name of the consumer for the GPIO line.
   * @param defaultVal The default value of the GPIO line, defaults to PinValue.Low.
   *
   * @throws If the GPIO line could not be set as an output, an error is thrown.
   */
  requestOutput(
    consumer: string,
    defaultVal: PinValueType = PinValue.Low,
  ): void {
    const consumerBuf = stringToCString(consumer);
    const ret = lib.symbols.gpiod_line_request_output(
      this.linePtr,
      consumerBuf,
      defaultVal,
    );
    if (typeof ret !== "number" || ret < 0) {
      throw new Error("Failed to set GPIO line as output.");
    }
  }

  /**
   * Requests the GPIO line to be configured as an input.
   *
   * @param consumer A string identifier for the consumer of the GPIO line.
   *
   * @throws Will throw an error if the line could not be set as input.
   */

  requestInput(consumer: string): void {
    const consumerBuf = stringToCString(consumer);
    const ret = lib.symbols.gpiod_line_request_input(this.linePtr, consumerBuf);
    if (typeof ret !== "number" || ret < 0) {
      throw new Error("Failed to set GPIO line as input.");
    }
  }

  /**
   * Gets the current value of the GPIO line.
   *
   * @returns The current value of the GPIO line as a PinValueType (0 or 1).
   *
   * @throws If the return value from gpiod_line_get_value is not a number, an
   *         error is thrown.
   */
  getValue(): PinValueType {
    const value = lib.symbols.gpiod_line_get_value(this.linePtr);
    if (typeof value !== "number") {
      throw new Error("Invalid value type returned from gpiod_line_get_value");
    }
    return value as PinValueType;
  }

  /**
   * Sets the value of the GPIO line.
   *
   * @param value The new value of the GPIO line as a PinValueType (0 or 1).
   */
  setValue(value: PinValueType): void {
    lib.symbols.gpiod_line_set_value(this.linePtr, value);
  }

  /**
   * Releases the GPIO line back to the system.
   *
   * This function will release the GPIO line from the current consumer and
   * allow it to be used by other processes.
   */
  release(): void {
    lib.symbols.gpiod_line_release(this.linePtr);
  }
}

// Example usage
if (import.meta.main) {
  const chip = new GpioChip();
  const line = chip.getLine(18);
  line.requestOutput("deno-gpio");
  line.setValue(PinValue.High);
  line.release();
  chip.close();
}
