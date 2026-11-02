
let socket;

let wiimote = {
    x: 471.48,
    y: 238.48,
    z: 288,
    tiltX: 0,
    tiltY: 0,
    buttonB: false
};

// Rotation smoothing
let smoothAxis;
let smoothAngle = 0;

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);

    // Initialize rotation vector
    smoothAxis = createVector(0, 0, 0);

    // Connect to Python WebSocket server
    connectWiimote();
}

function connectWiimote() {
    socket = new WebSocket("ws://localhost:8765");

    socket.onopen = function() {
        console.log("Connected to Wii Remote!");
    };

    socket.onmessage = function(event) {
        try {
            wiimote = JSON.parse(event.data);
        } catch (error) {
            console.error("Invalid Wii Remote data:", error);
        }
    };

    socket.onclose = function() {
        console.log("Wii Remote disconnected.");
    };

    socket.onerror = function(error) {
        console.log("WebSocket error:", error);
    };
}

function draw() {
    background(25);

    // Convert accelerometer readings into normalized values
    let accelX = (wiimote.x - 471.48) / 96.42;
    let accelY = (wiimote.y - 238.48) / 48.48;
    let accelZ = (wiimote.z - 239.03) / 48.97;

    // Create gravity vector
    let gravity = createVector(accelX, accelY, accelZ);

    if (gravity.mag() > 0.001) {
        gravity.normalize();
    }

    // Neutral gravity direction
    let worldUp = createVector(0, 0, 1);

    // Calculate rotation axis and angle
    let rotationAxis = gravity.copy().cross(worldUp);

    let rotationAngle = acos(
        constrain(gravity.dot(worldUp), -1, 1)
    );

    // Smooth rotation
    if (rotationAxis.mag() > 0.001) {
        rotationAxis.normalize();

        smoothAxis.lerp(rotationAxis, 0.12);

        if (smoothAxis.mag() > 0.001) {
            smoothAxis.normalize();
        }

        smoothAngle = lerp(smoothAngle, rotationAngle, 0.12);
    } else {
        smoothAngle = lerp(smoothAngle, 0, 0.12);
    }

    // Lighting
    ambientLight(100);
    directionalLight(255, 255, 255, -0.5, 0.5, -1);

    // Draw remote
    push();
    
            // Fixed 90-degree model alignment
        rotateX(HALF_PI);


    if (smoothAxis.mag() > 0.001) {
        rotate(smoothAngle, smoothAxis);
    }

    drawAxes();
    drawRemote();

    pop();

    // Interface text
    push();

    resetMatrix();
    translate(-width / 2, -height / 2);

    fill(255);
    noStroke();
    textSize(16);

    text("Wii Remote Orientation", 20, 30);
    text("Accel X: " + accelX.toFixed(2), 20, 60);
    text("Accel Y: " + accelY.toFixed(2), 20, 85);
    text("Accel Z: " + accelZ.toFixed(2), 20, 110);
    text("Rotation: " + degrees(smoothAngle).toFixed(1) + "°", 20, 135);
    text("B Button: " + (wiimote.buttonB ? "Pressed" : "Released"), 20, 160);

    pop();
}

function drawRemote() {
    // Remote body
    push();

    fill(235);
    specularMaterial(235);
    shininess(20);

    box(65, 190, 18);

    pop();

    // Buttons on front (+Z)
    push();

    translate(0, 0, 10);

    // D-pad
    fill(65);
    rect(-9, -55, 18, 40, 3);
    rect(-20, -42, 40, 14, 3);

    // Main buttons
    fill(60);
    circle(0, 5, 28);

    fill(90);
    circle(-19, -5, 12);
    circle(19, -5, 12);

    circle(0, 35, 15);

    // Lower buttons
    circle(-13, 65, 12);
    circle(13, 65, 12);

    pop();
}

function drawAxes() {
    strokeWeight(3);

    // X axis - red
    stroke(255, 50, 50);
    line(0, 0, 0, 100, 0, 0);

    // Y axis - green
    stroke(50, 255, 50);
    line(0, 0, 0, 0, 100, 0);

    // Z axis - blue
    stroke(50, 100, 255);
    line(0, 0, 0, 0, 0, 100);

    noStroke();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
