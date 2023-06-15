// Module code: CS5041
// Module: Interactive Hardware and Software
// Configuring the MicroHelper for Disability Assistance

// The code is based on "Getting started with the Web Serial API" tutorial
// Turotial by Google Codelabs, can be found here: https://codelabs.developers.google.com/web-serial#0

// Enable strict mode to enforce stricter parsing and error handling rules
("use strict");

let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

// We expect a value to be sent via serial containing a 6 bit number, a starting bit and a final parity
// Bit making the number of 1's odd.
const UPPER_CALIBRATION_BOUND = 63;
const LOWER_CALIBRATION_BOUND = 0;

// Function used to check there is an odd number of 1's
function count1s(bin_string) {
  let count = 0;
  for (let i = 0; i < bin_string.length; i++) {
    count = bin_string[i] == "1" ? count + 1 : count;
  }
  return count;
}

// Converts 8 bit binary string, including start and parity bits, into an int
function binToInt(bin_string) {
  console.log("Bin TO INt");
  let s_val = 0;
  s_val = bin_string[1] == "1" ? s_val + 32 : s_val;
  s_val = bin_string[2] == "1" ? s_val + 16 : s_val;
  s_val = bin_string[3] == "1" ? s_val + 8 : s_val;
  s_val = bin_string[4] == "1" ? s_val + 4 : s_val;
  s_val = bin_string[5] == "1" ? s_val + 2 : s_val;
  s_val = bin_string[6] == "1" ? s_val + 1 : s_val;
  return s_val;
}

// Return positive int if the string is valid, -1 if not
function checkStringValidity(bin_string) {
  try {
    const int_val = parseInt(bin_string);
    const str_val = int_val.toString();
    console.log(str_val);
    console.log(str_val.length);
    if (str_val.length == 8) {
      // console.log("bin_string1");
      if (count1s(str_val) % 2 == 1) {
        // console.log("bin_string2");
        if (str_val[0] == "1") {
          return binToInt(str_val);
        }
      }
    }
    return -1;
  } catch {
    return -1;
  }
}

// Define necessary variables from the HTML user interface in JS
const log = document.getElementById("log");
const ledCBs = document.querySelectorAll("input.led");
const divLeftBut = document.getElementById("leftBut");
const divRightBut = document.getElementById("rightBut");
const butConnect = document.getElementById("butConnect");

const GRID_HAPPY = [
  1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0,
];
const GRID_SAD = [
  1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1,
];

// Check and confirm that the Web Serial API is supported
document.addEventListener("DOMContentLoaded", () => {
  butConnect.addEventListener("click", clickConnect);
  initCheckboxes();

  const notSupported = document.getElementById("notSupported");
  notSupported.classList.toggle("hidden", "serial" in navigator);
});

/**
 * @name connect
 * Opens a Web Serial connection to a Micro:bit and sets up the input and
 * output stream
 */

// Open a Web Serial connection for the Micro:bit inputs and outputs
// Micro:bit uses baud connection for connecting the serial and the main processor
async function connect() {
  // Request a port and open a connection.
  port = await navigator.serial.requestPort();
  // Wait for the port to open.
  await port.open({ baudRate: 115200, bufferSize: 255 });

  // Using the JavaScript built-in Web API object TextDecoderStream to setup the output stream
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(port.writable);
  outputStream = encoder.writable;

  // Add code to read the stream here.
  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable.pipeThrough(
    new TransformStream(new LineBreakTransformer())
  );

  reader = inputStream.getReader();
  readSerial();
}

/**
 * @name disconnect
 * Closes the Web Serial connection
 */
async function disconnect() {
  drawGrid(GRID_SAD);
  sendGrid();

  // Close the input stream (reader)
  if (reader) {
    // console.log("Reader is dead");
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }

  // Close the output stream
  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }

  // Close the port.
  await port.close();
  port = null;
}

/**
 * @name clickConnect
 * Click handler for the connect/disconnect button
 */
async function clickConnect() {
  // Disconnect Micro:bit if connected
  if (port) {
    await disconnect();
    toggleUIConnected(false);
    return;
  }

  // Connect the Micro:bit
  await connect();
  // Reset the grid on connect
  drawGrid(GRID_HAPPY);

  toggleUIConnected(true);
}

/**
 * @name readSerial
 * Reads data from the serial input and use it to populate the bar
 */
async function readSerial() {
  while (true) {
    // console.log("Listening:");
    const { value, done } = await reader.read();
    // console.log("Listening:");
    if (value) {
      updateBar(value);
      // console.log(value);
    }
    if (done) {
      console.log("[readSerial] DONE", done);
      // Release lock on the ReadableStreamDefaultReader object
      reader.releaseLock();
      break;
    }
  }
}

/**
 * @name sendGrid
 * Iterate over the checkboxes and generates the command to set the LEDs
 */
function sendGrid() {
  // Generate the grid
  const arr = [];
  ledCBs.forEach((cb) => {
    arr.push(cb.checked === true ? 1 : 0);
  });
  writeToStream(`show(0b${arr.reverse().join("")})`);
}

/**
 * @name writeToStream
 * Get a writer from the output stream and send the lines to the Micro:bit
 * @param  {...string} lines lines to send to the Micro:bit
 */
function writeToStream(...lines) {
  // Write to output stream
  const writer = outputStream.getWriter();
  lines.forEach((line) => {
    console.log("[SEND]", line);
    writer.write(line + "\n");
  });
  writer.releaseLock();
}

/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line
    this.container = "";
  }

  transform(chunk, controller) {
    // Handle incoming chunk
    this.container += chunk;
    const lines = this.container.split("\r\n");
    this.container = lines.pop();
    lines.forEach((line) => controller.enqueue(line));
  }

  flush(controller) {
    // Flush the stream
    controller.enqueue(this.container);
  }
}

/**
 * @name JSONTransformer
 * TransformStream to parse the stream into a JSON object
 */
class JSONTransformer {
  transform(chunk, controller) {
    // Attempt to parse JSON content
    try {
      controller.enqueue(JSON.parse(chunk));
    } catch (e) {
      controller.enqueue(chunk);
    }
  }
}

/**
 * Code for user interface to simplify and enhance the user experience
 */

function initCheckboxes() {
  ledCBs.forEach((cb) => {
    cb.addEventListener("change", () => {
      sendGrid();
    });
  });
}

function drawGrid(grid) {
  if (grid) {
    grid.forEach((v, i) => {
      ledCBs[i].checked = !!v;
    });
  }
}

function toggleUIConnected(connected) {
  let lbl = "Connect";
  if (connected) {
    lbl = "Disconnect";
  }
  butConnect.textContent = lbl;
  ledCBs.forEach((cb) => {
    if (connected) {
      cb.removeAttribute("disabled");
      return;
    }
    cb.setAttribute("disabled", true);
  });
}

function updateBar(value) {
  const val = checkStringValidity(value);
  console.log("value : " + val);
  if (val >= 0) {
    console.log("Recieved: " + val);
    const width = (val / 63) * 100; // Add the max value instead, * 100 to convert to percentage
    document.getElementById("rectbox").setAttribute("width", width + "%");
  }
}
