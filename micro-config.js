// Module code: CS5041
// Module: Interactive Hardware and Software
// Matriculation numbers: 220024877, 180000870, 210000448
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
let testData = 1000;

// Define necessary variables from the HTML user interface in JS
const log = document.getElementById("log");
const ledCBs = document.querySelectorAll("input.led");
const divLeftBut = document.getElementById("leftBut");
const divRightBut = document.getElementById("rightBut");
const butConnect = document.getElementById("butConnect");

const GRID_HAPPY = [
  1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0,
];
const GRID_OFF = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
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
 * Opens a Web Serial connection to a micro:bit and sets up the input and
 * output stream.
 */

// Open a Web Serial connection for the MicroBit inputs and outputs
// MicroBit uses 9600 baud connection for connecting the serial and the main processor
async function connect() {
  // Request a port and open a connection.
  port = await navigator.serial.requestPort();
  // Wait for the port to open.
  await port.open({ baudRate: 9600 });

  // Using the JavaScript built-in Web API object TextDecoderStream to setup the output stream
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(port.writable);
  outputStream = encoder.writable;

  // Add code to read the stream here.
  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable
    .pipeThrough(new TransformStream(new LineBreakTransformer()))
    .pipeThrough(new TransformStream(new JSONTransformer()));

  reader = inputStream.getReader();
  readSerial();
}

/**
 * @name disconnect
 * Closes the Web Serial connection.
 */
async function disconnect() {
  drawGrid(GRID_OFF);
  sendGrid();

  // Close the input stream (reader)
  if (reader) {
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
 * Click handler for the connect/disconnect button.
 */
async function clickConnect() {
  // Add disconnect code here.
  if (port) {
    await disconnect();
    toggleUIConnected(false);
    return;
  }

  // Add connect code here.
  await connect();

  // Reset the grid on connect here.
  drawGrid(GRID_HAPPY);
  sendGrid();

  // Initialize micro:bit buttons.
  watchButton("BTN1");
  watchButton("BTN2");

  toggleUIConnected(true);
}

/**
 * @name readSerial
 * Reads data from the serial input and use it to populate the bar
 */
async function readSerial() {
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      // Do something with the serial data here
      updateBar(value);
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
 * Iterates over the checkboxes and generates the command to set the LEDs.
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
 * Gets a writer from the output stream and send the lines to the micro:bit.
 * @param  {...string} lines lines to send to the micro:bit
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
 * TransformStream to parse the stream into lines.
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
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
    // Flush the stream.
    controller.enqueue(this.container);
  }
}

/**
 * @name JSONTransformer
 * TransformStream to parse the stream into a JSON object.
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
 * The code below is mostly UI code and is provided to simplify the user experience.
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

document.getElementById("rectbox").setAttribute("width", testData);

function updateBar(value) {
  const width = (value / 100) * 100; // Add the max value instead, * 100 to convert to percentage
  document.getElementById("rectbox").setAttribute("width", width + "%");
}
