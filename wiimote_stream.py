
import hid
import json
import time
from websockets.sync.server import serve

# Wii Remote identification
VID = 0x057E
PID = 0x0306

# Accelerometer calibration
BASELINE_X = 471.48
BASELINE_Y = 238.48

SCALE_X = 96.42
SCALE_Y = 48.48

# LED control
def set_led(wiimote, led):
    wiimote.write([0x11, led])


def decode_report(report):
    x = (report[3] << 2) | ((report[1] >> 5) & 0b11)
    y = (report[4] << 1) | ((report[2] >> 5) & 0b1)
    z = (report[5] << 1) | ((report[2] >> 6) & 0b1)

    buttons = (report[1] << 8) | report[2]
    buttons &= ~0x6060

    return x, y, z, buttons


def stream_data(websocket):

    print("p5.js connected!")

    # Keep trying until the WebSocket closes
    while True:

        wiimote = hid.device()

        try:
            # Search for the Wii Remote
            devices = hid.enumerate(VID, PID)

            if not devices:
                print("Wii Remote not found. Retrying...")
                time.sleep(2)
                continue

            # Connect to the remote
            wiimote.open_path(devices[0]["path"])

            print("Wii Remote connected!")

            # Turn on LED 1
            set_led(wiimote, 0x10)

            # Enable buttons + accelerometer reports
            wiimote.write([0x12, 0x04, 0x31])
            #wiimote.write([0x11, 0x10])
            #wiimote.write([0x11, 0x50])  #led1 and 3
            #wiimote.write([0x11, 0x60]) #led2 and 3
            #wiimote.write([0x11, 0x70]) #led1, 1, 3
            #wiimote.write([0x11, 0x80]) #led4
            #wiimote.write([0x11, 0x90]) #led 1 and 4
            #wiimote.write([0x11, 0xA0]) #led 2 and 4
            #wiimote.write([0x11, 0xB0]) #led 1, 2, 4
            wiimote.write([0x11, 0xC0]) #led 3, 4
            # Count consecutive empty reads
            empty_reads = 0

            while True:

                report = wiimote.read(32, 100)

                # Detect possible disconnection
                if not report:
                    empty_reads += 1

                    if empty_reads >= 20:
                        raise ConnectionError(
                            "No reports received from Wii Remote."
                        )

                    continue

                empty_reads = 0

                if report[0] == 0x31:

                    x, y, z, buttons = decode_report(report)

                    # Convert readings into approximate tilt
                    tilt_x = (x - BASELINE_X) / SCALE_X
                    tilt_y = (y - BASELINE_Y) / SCALE_Y

                    # Check whether B is pressed
                    button_b = bool(buttons & 0x0004)

                    # Package sensor data
                    data = {
                        "x": x,
                        "y": y,
                        "z": z,
                        "tiltX": tilt_x,
                        "tiltY": tilt_y,
                        "buttonB": button_b
                    }

                    # Send data to p5.js
                    try:
                        websocket.send(json.dumps(data))

                    except Exception as error:
                        print("p5.js disconnected:", error)
                        return

        except Exception as error:
            print("Wii Remote connection error:", error)

        finally:
            wiimote.close()
            print("Wii Remote connection closed.")

        print("Waiting 2 seconds before reconnecting...")
        time.sleep(2)


print("Starting Wii Remote WebSocket server...")
print("Waiting for p5.js on localhost:8765")
print("Press CTRL+C to stop.")

try:
    with serve(stream_data, "localhost", 8765) as server:
        server.serve_forever()

except KeyboardInterrupt:
    print("\nStopping Wii Remote stream...")

finally:
    print("Wii Remote server stopped.")