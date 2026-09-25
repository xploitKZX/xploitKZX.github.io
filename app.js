let currentGamepad = null;
let selectedIndex = 0;
let lastButtons = [];

const menuCards = Array.from(
    document.querySelectorAll(".menu-card")
);

const logWindow = document.getElementById("logWindow");

function log(type, message) {
    const entry = document.createElement("div");

    entry.className = "log-entry";

    entry.innerHTML =
        `<span>[${type}]</span> ${message}`;

    logWindow.appendChild(entry);

    logWindow.scrollTop = logWindow.scrollHeight;
}

function selectCard(index) {

    if (index < 0) {
        index = menuCards.length - 1;
    }

    if (index >= menuCards.length) {
        index = 0;
    }

    selectedIndex = index;

    menuCards.forEach((card, i) => {
        card.classList.toggle(
            "selected",
            i === selectedIndex
        );
    });

    menuCards[selectedIndex].focus();
}

function activateCard() {

    const card = menuCards[selectedIndex];

    if (!card) {
        return;
    }

    const page = card.dataset.page;

    log(
        "NAVIGATION",
        `Opening ${page.toUpperCase()}`
    );

    alert(
        `${page.toUpperCase()} module\n\nModule en préparation dans la V1.1.`
    );
}

menuCards.forEach((card, index) => {

    card.addEventListener("click", () => {
        selectedIndex = index;
        selectCard(index);
        activateCard();
    });

});


function detectController() {

    const pads = navigator.getGamepads
        ? navigator.getGamepads()
        : [];

    let found = null;

    for (const pad of pads) {

        if (pad && pad.connected) {
            found = pad;
            break;
        }

    }

    if (found && !currentGamepad) {

        currentGamepad = found;

        document.getElementById(
            "controllerName"
        ).textContent =
            found.id.substring(0, 50);

        document.getElementById(
            "controllerStatus"
        ).textContent =
            "Controller connected";

        log(
            "CONTROLLER",
            "Gamepad connected"
        );

        lastButtons = [];

    }

    if (!found && currentGamepad) {

        currentGamepad = null;

        document.getElementById(
            "controllerName"
        ).textContent =
            "NO CONTROLLER";

        document.getElementById(
            "controllerStatus"
        ).textContent =
            "Connect a DualShock 4 and press any button";

        log(
            "CONTROLLER",
            "Gamepad disconnected"
        );

    }

}

window.addEventListener(
    "gamepadconnected",
    detectController
);

window.addEventListener(
    "gamepaddisconnected",
    detectController
);


function updateStick(elementId, x, y) {

    const element =
        document.getElementById(elementId);

    if (!element) {
        return;
    }

    const max = 30;

    const px = Math.max(
        -max,
        Math.min(max, x * max)
    );

    const py = Math.max(
        -max,
        Math.min(max, y * max)
    );

    element.style.transform =
        `translate(${px}px, ${py}px)`;
}


function updateController() {

    detectController();

    if (!currentGamepad) {
        requestAnimationFrame(updateController);
        return;
    }

    const pad = currentGamepad;

    const axes = pad.axes || [];

    const leftX = axes[0] || 0;
    const leftY = axes[1] || 0;

    const rightX = axes[2] || 0;
    const rightY = axes[3] || 0;

    updateStick(
        "leftStick",
        leftX,
        leftY
    );

    updateStick(
        "rightStick",
        rightX,
        rightY
    );

    const buttons = pad.buttons || [];

    const pressed = index => {
        return buttons[index] &&
               buttons[index].pressed;
    };

    document.getElementById("btnX").textContent =
        pressed(0) ? "PRESSED" : "READY";

    document.getElementById("btnO").textContent =
        pressed(1) ? "PRESSED" : "READY";

    document.getElementById("btnOptions").textContent =
        pressed(9) ? "PRESSED" : "READY";

    document.getElementById("btnShoulders").textContent =
        (pressed(4) || pressed(5))
            ? "PRESSED"
            : "READY";


    handleNavigation(pad);

    requestAnimationFrame(updateController);
}


function handleNavigation(pad) {

    const now = Date.now();

    if (!handleNavigation.lastTime) {
        handleNavigation.lastTime = 0;
    }

    if (now - handleNavigation.lastTime < 180) {
        return;
    }

    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;

    if (y < -0.6) {

        selectCard(selectedIndex - 3);

        handleNavigation.lastTime = now;

        return;
    }

    if (y > 0.6) {

        selectCard(selectedIndex + 3);

        handleNavigation.lastTime = now;

        return;
    }

    if (x < -0.6) {

        selectCard(selectedIndex - 1);

        handleNavigation.lastTime = now;

        return;
    }

    if (x > 0.6) {

        selectCard(selectedIndex + 1);

        handleNavigation.lastTime = now;

        return;
    }

    if (pad.buttons[0]?.pressed) {

        activateCard();

        handleNavigation.lastTime = now;
    }

}


async function scanConsole() {

    const button =
        document.getElementById("scanButton");

    button.disabled = true;
    button.textContent = "SCANNING...";

    log(
        "NETWORK",
        "Starting console scan"
    );

    /*
     * Pour GitHub Pages, le navigateur ne peut pas
     * effectuer librement des connexions TCP vers
     * 2121/3232/9090.
     *
     * Cette fonction est donc prête à communiquer
     * avec le serveur Python local que nous ajouterons.
     */

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/status",
            {
                method: "GET"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data = await response.json();

        updateConsole(data);

        log(
            "NETWORK",
            "Console scan completed"
        );

    } catch (error) {

        log(
            "NETWORK",
            "Local PS4 bridge unavailable"
        );

        document.getElementById(
            "consoleStatus"
        ).textContent =
            "Bridge offline";

    }

    button.disabled = false;
    button.textContent = "SCAN CONSOLE";
}


function updateConsole(data) {

    if (!data) {
        return;
    }

    if (data.ip) {

        document.getElementById(
            "ps4Ip"
        ).textContent = data.ip;

        document.getElementById(
            "infoIp"
        ).textContent = data.ip;
    }

    if (data.firmware) {

        document.getElementById(
            "firmware"
        ).textContent = data.firmware;
    }

    if (data.goldhen) {

        document.getElementById(
            "goldhen"
        ).textContent = data.goldhen;
    }

    if (data.network) {

        document.getElementById(
            "network"
        ).textContent = data.network;
    }

    if (data.online) {

        document.querySelector(
            ".connection"
        ).classList.add("online");

        document.getElementById(
            "connectionText"
        ).textContent = "ONLINE";

        document.querySelector(
            ".status-line"
        ).classList.add("online");

        document.getElementById(
            "consoleStatus"
        ).textContent =
            "Console connected";
    }

}


document
    .getElementById("scanButton")
    .addEventListener(
        "click",
        scanConsole
    );


selectCard(0);

updateController();

log(
    "SYSTEM",
    "Controller navigation enabled"
);
