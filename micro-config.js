// Module code: CS5041
// Module: Interactive Hardware and Software
// Matriculation numbers: 220024877, 180000870, 210000448
// Configuring the MicroHelper for Disability Assistance

// Define necessary variables from the HTML user interface in JS
const butConnect = document.getElementById("butConnect");

// Check and confirm that the Web Serial API is supported
document.addEventListener("DOMContentLoaded", () => {
  butConnect.addEventListener("click", clickConnect);

  const notSupported = document.getElementById("notSupported");
  notSupported.classList.toggle("hidden", "serial" in navigator);
});

// Open a Web Serial connection for the MicroBit inputs and outputs
// MicroBit uses 9600 baud connection for connecting the serial and the main processor
async function connect() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
}
