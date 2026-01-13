import {
  add_toast,
  init_toast,
  add_toast_from_error,
  gen_toast,
} from "./toast.js";
import { ws } from "./ws_stuff.js";

import { check_server_health } from "./encryptions_stuff.js";

const KEY_SERVER_URL = "http://localhost:8888";

/**
 *
 * @param {MessageEvent<any>} msg
 */
function handle_window_message(msg) {
  if (msg.data.type === "KEY_EXPORT") {
    const imported_key = msg.data.key;
    document.getElementById("privateKeyInput").value = imported_key;
    gen_toast("Imported Key!", "success", 5000);
  }
}

function import_key_flow() {
  const username_value = document.getElementById("userinputBox").value;
  const key_repo_window = window.open(
    `${KEY_SERVER_URL}?username=${username_value}`,
    "test",
    `resizable=no,status=no,location=no,toolbar=no,menubar=no,
width=600,height=600`
  );

  check_server_health().then((healthy) => {
    if (!healthy) {
      window.close();
      add_toast_from_error(new Error("Key Server is Down!"), 5000);
    }
  });

  const interval = setInterval(() => {
    if (key_repo_window.closed) {
      console.log("WINDOW CLOSED");
      clearInterval(interval);
      window.removeEventListener("message", handle_window_message);
    }
  }, 500);

  window.addEventListener("message", handle_window_message);
}

ws.onmessage = (msg) => {
  const json = JSON.parse(msg.data);

  if (!("event" in json)) return;

  if (json.event === "CONF_REGISTRATION") {
    ws.send(JSON.stringify({ announce_arrival: true }));
    sessionStorage.setItem("USERNAME", json.username);
    window.location = "/chat.html";
  }

  if (json.event === "CHK_AVAILABLE") {
    const elem = document.getElementById("username_status");
    const { is_avalible, username } = json;

    elem.innerHTML = `Username <b>${username}</b> is ${
      is_avalible ? "available" : "taken"
    }`;
  }

  if (json.event === "ERROR") {
    add_toast_from_error(new Error(json.error.err_msg));
  }
};

let debounce_last_timeout;
function handle_check_username_available() {
  if (debounce_last_timeout) clearTimeout(debounce_last_timeout);
  const username = document.getElementById("userinputBox").value;
  if (!username) return;

  debounce_last_timeout = setTimeout(() => {
    ws.send(JSON.stringify({ check_availible: username }));
  }, 500);
}

/**
 *
 * @param {SubmitEvent} e
 */
function handle_submit(e) {
  e.preventDefault();
  const username = document.getElementById("userinputBox").value;
  const private_key = document.getElementById("privateKeyInput").value;

  sessionStorage.setItem("PRIVATE_KEY", private_key);

  ws.send(JSON.stringify({ username }));
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("userForm").onsubmit = handle_submit;
  document.getElementById("import_key_btn").onclick = import_key_flow;
  document.getElementById("userinputBox").onkeyup =
    handle_check_username_available;
  init_toast();
});
