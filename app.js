const DEFAULT_BRIDGE = "http://127.0.0.1:5000";

let bridge =
    localStorage.getItem("ps4_bridge")
    || DEFAULT_BRIDGE;

let ps4Ip =
    localStorage.getItem("ps4_ip")
    || "192.168.1.35";

let currentGamepad = null;
let selectedNav = 0;
let lastNavigation = 0;

const navButtons =
    [...document.querySelectorAll(".nav-button")];

const pages =
    [...document.querySelectorAll(".page")];

function log(type, message) {

    const container =
        document.getElementById("log");

    const line =
        document.createElement("div");

    line.innerHTML =
        `<span>[${type}]</span> ${escapeHtml(message)}`;

    container.appendChild(line);

    container.scrollTop =
        container.scrollHeight;
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showPage(name) {

    pages.forEach(page => {

        page.classList.toggle(
            "active",
            page.id === `page-${name}`
        );

    });

    navButtons.forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === name
        );

    });

    const index =
        navButtons.findIndex(
            button => button.dataset.page === name
        );

    if (index >= 0) {
        selectedNav = index;
    }

    log(
        "UI",
        `Opened ${name}`
    );

}


navButtons.forEach((button, index) => {

    button.addEventListener("click", () => {

        selectedNav = index;

        showPage(
            button.dataset.page
        );

    });

});


function setOnline(online) {

    const dot =
        document.getElementById("onlineDot");

    const text =
        document.getElementById("onlineText");

    dot.classList.toggle(
        "online",
        online
    );

    dot.classList.toggle(
        "offline",
        !online
    );

    text.textContent =
        online
            ? "ONLINE"
            : "OFFLINE";
}


function setBadge(id, open) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.classList.remove(
        "online",
        "offline",
        "unknown"
    );

    if (open) {

        element.classList.add("online");
        element.textContent = "ONLINE";

    } else {

        element.classList.add("offline");
        element.textContent = "OFFLINE";

    }
}


async function api(path, options = {}) {

    const url =
        bridge.replace(/\/$/, "") + path;

    const response =
        await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {})
            }
        });

    const text =
        await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        data = {
            raw: text
        };
    }

    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            `HTTP ${response.status}`
        );

    }

    return data;
}


async function scanConsole() {

    const button =
        document.getElementById("scanButton");

    button.disabled = true;
    button.textContent = "SCANNING...";

    log(
        "NETWORK",
        `Scanning ${ps4Ip}`
    );

    try {

        const data =
            await api(
                `/api/status?ip=${encodeURIComponent(ps4Ip)}`
            );

        updateDashboard(data);

        log(
            "NETWORK",
            data.status || "Scan completed"
        );

    } catch (error) {

        setOnline(false);

        document.getElementById(
            "consoleState"
        ).textContent =
            "Bridge unavailable";

        log(
            "ERROR",
            error.message
        );

    }

    button.disabled = false;
    button.textContent = "SCAN PS4";
}


function updateDashboard(data) {

    if (data.ip) {

        ps4Ip = data.ip;

        document.getElementById(
            "consoleIp"
        ).textContent = data.ip;

        document.getElementById(
            "topIp"
        ).textContent = data.ip;

    }

    setOnline(
        Boolean(data.ok)
    );

    document.getElementById(
        "consoleState"
    ).textContent =
        data.status ||
        (data.ok
            ? "Console connected"
            : "Console unavailable");


    const services =
        data.services || {};


    if (services.ftp) {

        setBadge(
            "ftpStatus",
            services.ftp.open
        );

        document.getElementById(
            "ftpLatency"
        ).textContent =
            services.ftp.open
                ? `${services.ftp.latency_ms} ms`
                : services.ftp.error || "Unavailable";

    }


    if (services.klog) {

        setBadge(
            "klogStatus",
            services.klog.open
        );

        document.getElementById(
            "klogLatency"
        ).textContent =
            services.klog.open
                ? `${services.klog.latency_ms} ms`
                : services.klog.error || "Unavailable";

    }


    if (services.binloader) {

        setBadge(
            "binStatus",
            services.binloader.open
        );

        document.getElementById(
            "binLatency"
        ).textContent =
            services.binloader.open
                ? `${services.binloader.latency_ms} ms`
                : services.binloader.error || "Unavailable";

    }


    if (services.ftp?.latency_ms) {

        document.getElementById(
            "latency"
        ).textContent =
            `${services.ftp.latency_ms} ms`;

    }


    document.getElementById(
        "network"
    ).textContent =
        data.ok
            ? "CONNECTED"
            : "OFFLINE";


    /*
     * Le firmware n'est pas inventé.
     * Si le bridge ne le connaît pas,
     * on affiche UNKNOWN.
     */

    document.getElementById(
        "firmware"
    ).textContent =
        data.firmware || "UNKNOWN";

    document.getElementById(
        "goldhen"
    ).textContent =
        data.goldhen || "UNKNOWN";
}


async function scanNetwork() {

    const button =
        document.getElementById(
            "networkScanButton"
        );

    button.disabled = true;
    button.textContent = "SCANNING...";

    log(
        "NETWORK",
        "Starting service scan"
    );

    try {

        const data =
            await api(
                `/api/scan?ip=${encodeURIComponent(ps4Ip)}`
            );

        renderPorts(
            data.ports || []
        );

        log(
            "NETWORK",
            `${data.open_count || 0} open service(s)`
        );

    } catch (error) {

        log(
            "ERROR",
            error.message
        );

    }

    button.disabled = false;
    button.textContent = "START SCAN";
}


function renderPorts(ports) {

    const table =
        document.getElementById(
            "portTable"
        );

    table.innerHTML = "";

    if (!ports.length) {

        table.innerHTML =
            `<div class="empty-row">
                No result
             </div>`;

        return;
    }


    ports.forEach(port => {

        const row =
            document.createElement("div");

        row.className = "port-row";

        const status =
            port.open
                ? "OPEN"
                : "CLOSED";

        const statusClass =
            port.open
                ? "port-open"
                : "port-closed";

        row.innerHTML = `
            <span>${escapeHtml(port.port)}</span>
            <span>${escapeHtml(port.service)}</span>
            <span class="${statusClass}">
                ${status}
            </span>
            <span>
                ${
                    port.latency_ms !== null &&
                    port.latency_ms !== undefined
                        ? escapeHtml(port.latency_ms) + " ms"
                        : "-"
                }
            </span>
        `;

        table.appendChild(row);

    });

}


document
    .getElementById("scanButton")
    .addEventListener(
        "click",
        scanConsole
    );


document
    .getElementById("networkScanButton")
    .addEventListener(
        "click",
        scanNetwork
    );


/* PAYLOAD */

const payloadInput =
    document.getElementById(
        "payloadFile"
    );

payloadInput.addEventListener(
    "change",
    () => {

        const file =
            payloadInput.files[0];

        document.getElementById(
            "payloadName"
        ).textContent =
            file
                ? `${file.name} — ${formatBytes(file.size)}`
                : "No payload selected";

    }
);


document
    .getElementById(
        "sendPayloadButton"
    )
    .addEventListener(
        "click",
        async () => {

            const file =
                payloadInput.files[0];

            if (!file) {

                log(
                    "PAYLOAD",
                    "No BIN selected"
                );

                return;
            }

            const result =
                document.getElementById(
                    "payloadResult"
                );

            result.textContent =
                "Sending payload...";

            log(
                "PAYLOAD",
                `Sending ${file.name}`
            );

            try {

                const form =
                    new FormData();

                form.append(
                    "file",
                    file
                );

                const data =
                    await api(
                        "/api/bin/send",
                        {
                            method: "POST",
                            body: form
                        }
                    );

                result.textContent =
                    data.message ||
                    "Payload sent";

                log(
                    "PAYLOAD",
                    data.message || "Payload sent"
                );

            } catch (error) {

                result.textContent =
                    `ERROR: ${error.message}`;

                log(
                    "ERROR",
                    error.message
                );

            }

        }
    );


/* FTP */

async function openFtpDirectory(path) {

    const container =
        document.getElementById(
            "ftpFiles"
        );

    container.innerHTML =
        `<div class="empty-row">
            Loading...
         </div>`;

    try {

        const data =
            await api(
                `/api/ftp/list?ip=${encodeURIComponent(ps4Ip)}&path=${encodeURIComponent(path)}`
            );

        renderFtpFiles(
            data.path,
            data.files || []
        );

        document.getElementById(
            "ftpPath"
        ).value =
            data.path;

        log(
            "FTP",
            `Opened ${data.path}`
        );

    } catch (error) {

        container.innerHTML =
            `<div class="empty-row">
                ${escapeHtml(error.message)}
             </div>`;

        log(
            "ERROR",
            error.message
        );

    }

}


function renderFtpFiles(path, files) {

    const container =
        document.getElementById(
            "ftpFiles"
        );

    container.innerHTML = "";


    if (path !== "/") {

        const parent =
            document.createElement("div");

        parent.className =
            "file-row";

        parent.innerHTML = `
            <button data-path="..">
                .. / PARENT
            </button>
            <span>DIRECTORY</span>
            <span>-</span>
        `;

        parent
            .querySelector("button")
            .addEventListener(
                "click",
                () => {

                    const clean =
                        path.replace(/\/+$/, "");

                    const parentPath =
                        clean.substring(
                            0,
                            clean.lastIndexOf("/")
                        ) || "/";

                    openFtpDirectory(
                        parentPath
                    );

                }
            );

        container.appendChild(parent);

    }


    files.forEach(file => {

        const row =
            document.createElement("div");

        row.className =
            "file-row";


        const name =
            document.createElement("button");

        name.textContent =
            file.name;


        if (file.type === "dir") {

            name.addEventListener(
                "click",
                () => {

                    const next =
                        path === "/"
                            ? `/${file.name}`
                            : `${path}/${file.name}`;

                    openFtpDirectory(
                        next
                    );

                }
            );

        } else {

            name.disabled = true;

        }


        const type =
            document.createElement("span");

        type.textContent =
            file.type === "dir"
                ? "DIRECTORY"
                : formatBytes(
                    file.size || 0
                );


        const action =
            document.createElement("span");

        action.textContent =
            file.type === "dir"
                ? "OPEN"
                : "";


        row.appendChild(name);
        row.appendChild(type);
        row.appendChild(action);

        container.appendChild(row);

    });

}


document
    .getElementById(
        "ftpOpenButton"
    )
    .addEventListener(
        "click",
        () => {

            openFtpDirectory(
                document.getElementById(
                    "ftpPath"
                ).value
            );

        }
    );


document
    .getElementById(
        "ftpRefreshButton"
    )
    .addEventListener(
        "click",
        () => {

            openFtpDirectory(
                document.getElementById(
                    "ftpPath"
                ).value
            );

        }
    );


/* FTP UPLOAD */

document
    .getElementById(
        "ftpUploadButton"
    )
    .addEventListener(
        "click",
        async () => {

            const input =
                document.getElementById(
                    "ftpUploadFile"
                );

            const file =
                input.files[0];

            if (!file) {

                log(
                    "FTP",
                    "No file selected"
                );

                return;
            }

            const path =
                document.getElementById(
                    "ftpPath"
                ).value;


            const form =
                new FormData();

            form.append(
                "file",
                file
            );

            form.append(
                "path",
                path
            );

            log(
                "FTP",
                `Uploading ${file.name}`
            );

            try {

                const data =
                    await api(
                        "/api/ftp/upload",
                        {
                            method: "POST",
                            body: form
                        }
                    );

                log(
                    "FTP",
                    data.message
                );

                openFtpDirectory(
                    path
                );

            } catch (error) {

                log(
                    "ERROR",
                    error.message
                );

            }

        }
    );


/* PKG */

document
    .getElementById(
        "pkgUploadButton"
    )
    .addEventListener(
        "click",
        async () => {

            const input =
                document.getElementById(
                    "pkgFile"
                );

            const file =
                input.files[0];

            const result =
                document.getElementById(
                    "pkgResult"
                );

            if (!file) {

                result.textContent =
                    "Select a PKG first.";

                return;
            }

            result.textContent =
                "Uploading PKG...";

            log(
                "PKG",
                `Uploading ${file.name}`
            );

            try {

                const form =
                    new FormData();

                form.append(
                    "file",
                    file
                );

                const data =
                    await api(
                        "/api/pkg/upload",
                        {
                            method: "POST",
                            body: form
                        }
                    );

                result.textContent =
                    data.message;

                log(
                    "PKG",
                    data.message
                );

            } catch (error) {

                result.textContent =
                    `ERROR: ${error.message}`;

                log(
                    "ERROR",
                    error.message
                );

            }

        }
    );


/* SETTINGS */

function loadSettings() {

    document.getElementById(
        "settingsIp"
    ).value =
        ps4Ip;

    document.getElementById(
        "settingsBridge"
    ).value =
        bridge;

}


document
    .getElementById(
        "saveSettings"
    )
    .addEventListener(
        "click",
        () => {

            ps4Ip =
                document.getElementById(
                    "settingsIp"
                ).value.trim();

            bridge =
                document.getElementById(
                    "settingsBridge"
                ).value.trim()
                    .replace(/\/$/, "");


            localStorage.setItem(
                "ps4_ip",
                ps4Ip
            );

            localStorage.setItem(
                "ps4_bridge",
                bridge
            );


            document.getElementById(
                "consoleIp"
            ).textContent =
                ps4Ip;

            document.getElementById(
                "topIp"
            ).textContent =
                ps4Ip;


            log(
                "SETTINGS",
                "Configuration saved"
            );

        }
    );


/* GAMEPAD */

function findGamepad() {

    if (!navigator.getGamepads) {
        return null;
    }

    const pads =
        navigator.getGamepads();

    for (const pad of pads) {

        if (pad && pad.connected) {
            return pad;
        }

    }

    return null;
}


function updateGamepad() {

    const pad =
        findGamepad();

    if (pad && !currentGamepad) {

        currentGamepad = pad;

        document.getElementById(
            "controllerName"
        ).textContent =
            pad.id;

        document.getElementById(
            "controllerState"
        ).textContent =
            "Controller connected";

        log(
            "CONTROLLER",
            "Gamepad connected"
        );

    }


    if (!pad && currentGamepad) {

        currentGamepad = null;

        document.getElementById(
            "controllerName"
        ).textContent =
            "NO CONTROLLER";

        document.getElementById(
            "controllerState"
        ).textContent =
            "Press any button";

        log(
            "CONTROLLER",
            "Gamepad disconnected"
        );

    }


    if (pad) {

        updateSticks(pad);
        updateButtons(pad);
        handleGamepadNavigation(pad);

    }


    requestAnimationFrame(
        updateGamepad
    );

}


function updateSticks(pad) {

    const axes =
        pad.axes || [];

    const lx =
        axes[0] || 0;

    const ly =
        axes[1] || 0;

    const rx =
        axes[2] || 0;

    const ry =
        axes[3] || 0;


    moveStick(
        "leftStick",
        lx,
        ly
    );

    moveStick(
        "rightStick",
        rx,
        ry
    );


    document.getElementById(
        "leftAxis"
    ).textContent =
        `X ${lx.toFixed(2)} / Y ${ly.toFixed(2)}`;

    document.getElementById(
        "rightAxis"
    ).textContent =
        `X ${rx.toFixed(2)} / Y ${ry.toFixed(2)}`;

}


function moveStick(id, x, y) {

    const element =
        document.getElementById(id);

    const max =
        45;

    element.style.transform =
        `translate(
            ${x * max}px,
            ${y * max}px
        )`;

}


function buttonPressed(
    pad,
    index
) {

    return Boolean(
        pad.buttons &&
        pad.buttons[index] &&
        pad.buttons[index].pressed
    );

}


function setButton(
    id,
    pressed
) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        pressed
            ? "PRESSED"
            : "READY";

    element.style.color =
        pressed
            ? "var(--blue2)"
            : "var(--green)";

}


function updateButtons(pad) {

    setButton(
        "buttonX",
        buttonPressed(pad, 0)
    );

    setButton(
        "buttonO",
        buttonPressed(pad, 1)
    );

    setButton(
        "buttonTriangle",
        buttonPressed(pad, 2)
    );

    setButton(
        "buttonSquare",
        buttonPressed(pad, 3)
    );

    setButton(
        "buttonL1",
        buttonPressed(pad, 4)
    );

    setButton(
        "buttonR1",
        buttonPressed(pad, 5)
    );

    setButton(
        "buttonOptions",
        buttonPressed(pad, 9)
    );

    setButton(
        "buttonShare",
        buttonPressed(pad, 8)
    );

}


function handleGamepadNavigation(pad) {

    const now =
        performance.now();

    if (
        now - lastNavigation <
        220
    ) {
        return;
    }


    const x =
        pad.axes?.[0] || 0;

    const y =
        pad.axes?.[1] || 0;


    if (y < -0.65) {

        selectedNav--;

        if (selectedNav < 0) {
            selectedNav =
                navButtons.length - 1;
        }

        selectNav();

        lastNavigation = now;

        return;
    }


    if (y > 0.65) {

        selectedNav++;

        if (
            selectedNav >=
            navButtons.length
        ) {
            selectedNav = 0;
        }

        selectNav();

        lastNavigation = now;

        return;
    }


    if (x < -0.65) {

        selectedNav--;

        if (selectedNav < 0) {
            selectedNav =
                navButtons.length - 1;
        }

        selectNav();

        lastNavigation = now;

        return;
    }


    if (x > 0.65) {

        selectedNav++;

        if (
            selectedNav >=
            navButtons.length
        ) {
            selectedNav = 0;
        }

        selectNav();

        lastNavigation = now;

        return;
    }


    if (buttonPressed(pad, 0)) {

        const button =
            navButtons[selectedNav];

        if (button) {

            showPage(
                button.dataset.page
            );

        }

        lastNavigation = now;
    }

}


function selectNav() {

    navButtons.forEach(
        (button, index) => {

            button.classList.toggle(
                "active",
                index === selectedNav
            );

        }
    );

}


/* UTILS */

function formatBytes(bytes) {

    if (!bytes) {
        return "0 B";
    }

    const units =
        [
            "B",
            "KB",
            "MB",
            "GB"
        ];

    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        (bytes /
            Math.pow(1024, index)
        ).toFixed(2)
        + " "
        + units[index]
    );

}


/* INIT */

loadSettings();

selectNav();

updateGamepad();

log(
    "SYSTEM",
    "PS4 Control Center V2 ready"
);

log(
    "SYSTEM",
    `Target PS4: ${ps4Ip}`
);
