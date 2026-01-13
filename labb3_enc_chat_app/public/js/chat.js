import { check_server_health } from "./encryptions_stuff.js";
import { add_toast_from_error, init_toast } from "./toast.js";
import { add_msg_listener, ws } from "./ws_stuff.js";
const CHECK_HEALTH_INTERVAL = 1000 * 5;

let username;
let priv_key;
let recipients = new Map();
let active_users = new Map();
const encryptor = new JSEncrypt();
const decryptor = new JSEncrypt();

async function _chk_health(badge) {
  const resp = await check_server_health();
  const server_status_text = resp ? "Online" : "Offline";

  badge.innerText = `Key Server is ${server_status_text}`;
  badge.classList = `badge ${server_status_text.toLowerCase()}`;
}

function start_check_encr_server_status_interval() {
  const badge = document.getElementById("server_health_badge");
  _chk_health(badge);
  setInterval(async () => _chk_health(badge), CHECK_HEALTH_INTERVAL);
}

function setup_enviroment() {
  priv_key = sessionStorage.getItem("PRIVATE_KEY");
  username = sessionStorage.getItem("USERNAME");

  if (priv_key) {
    decryptor.setPrivateKey(priv_key);
  }
}

function handle_text_area() {
  const tx = document.getElementById("msg_content");

  tx.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handle_send_chat();
    }
  });

  tx.addEventListener("input", (e) => {
    tx.style.height = "auto";
    tx.style.height = `${tx.scrollHeight}px`;
  });
}

function handle_send_chat() {
  const chat_content = document.getElementById("msg_content").value;

  if (!chat_content)
    return add_toast_from_error(new Error("you cannot send an empty message"));

  if (recipients.size !== 0) {
    for (const [username, pub_key] of recipients.entries()) {
      encryptor.setPublicKey(pub_key);
      ws.send(
        JSON.stringify({
          content: encryptor.encrypt(chat_content),
          encryption: { is_encrypted: true, intended_recipient: username },
        })
      );
    }
  } else {
    ws.send(
      JSON.stringify({
        content: chat_content,
      })
    );
  }
}

function get_current_timestamp() {
  const d = document.createElement("time");
  const now = new Date();
  d.innerText = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  d.setAttribute("time", now.getTime());
  return d;
}

/**
 *
 * @param {string} content
 * @param {string} username
 * @param {string} colour
 * @param {boolean} is_encrypted
 */
function create_message(content, m_username, colour, is_encrypted = false) {
  const msg = document.createElement("div");
  msg.classList = "msg";

  const meta_row = document.createElement("div");
  meta_row.classList = "meta";
  const username_p = document.createElement("p");
  username_p.innerText = m_username;
  username_p.style.color = colour;
  meta_row.append(username_p, get_current_timestamp());

  const content_p = document.createElement(!content ? "i" : "p");
  content_p.classList = "content";
  content_p.innerText = !content ? "Failed to decrypt content." : content;

  msg.append(meta_row, content_p);

  if (is_encrypted) {
    const info = document.createElement("small");
    info.classList = "p2p_enc_info";
    info.innerText = "delivered with E2E encryption";
    msg.append(info);
  }

  return msg;
}

/**
 *
 * @param {{ event: "MESSAGE", user: { colour: string, username: string } | "System", encryption?: { is_encrypted: true, intended_recipient: string }, message: string }} msg_event
 */
function handle_message(msg_event) {
  if (
    msg_event.encryption &&
    msg_event.encryption.intended_recipient !== username
  )
    return;

  console.log("MESSAGE", msg_event);

  const user_obj =
    msg_event.user === "System"
      ? { username: "System", colour: "#00A5CF" }
      : msg_event.user;

  const container = document.getElementById("messages");

  const content = msg_event.encryption
    ? decryptor.decrypt(msg_event.message)
    : msg_event.message;

  const message = create_message(
    content,
    user_obj.username,
    user_obj.colour,
    !!msg_event.encryption
  );

  container.append(message);

  container.scrollTo({
    behavior: "smooth",
    top: message.offsetTop,
  });
}

add_msg_listener((event) => {
  if (event.event === "MESSAGE") {
    if (event.user.username === username) {
      const elem = document.getElementById("msg_content");

      handle_message({
        event: "MESSAGE",
        user: { username, colour: "#25A18E" },
        message: elem.value,
      });

      elem.value = "";
      elem.style.height = "auto";
      return;
    }

    handle_message(event);
  }

  if (event.event === "CONF_REGISTRATION") {
    username = event.username;
    handle_send_chat();
  }

  if (event.event === "ERROR") {
    if (event.error?.title === "PLEASE_REREG") {
      return ws.send(JSON.stringify({ username }));
    }

    add_toast_from_error(new Error(event.error.err_msg));
  }

  if (event.event === "SYNC_USERS") {
    active_users = new Map(event.active_clients);
    setup_key_selection();
  }

  if (event.event === "CLIENT_LEFT") {
    active_users.delete(event.username);
    setup_key_selection();
  }

  if (event.event === "CLIENT_JOINED") {
    active_users.set(event.username, event);
    setup_key_selection();
  }
});

/**
 *
 * @param {{ username: string, pub_key?: string }[]} mapped_keys
 */
function update_key_list(mapped_keys) {
  const list = document.getElementById("key_list");

  let nodes = [];

  for (const value of mapped_keys) {
    const existing_item = Array.from(list.children).find(
      (e) => e.getAttribute("x-username") === value.username
    );

    if (existing_item) {
      nodes.push(existing_item);
      continue;
    }

    const elem = document.createElement("div");
    elem.setAttribute("x-username", value.username);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    if (value.username === username || !value.pub_key)
      checkbox.setAttribute("disabled", true);

    checkbox.oninput = (_e) => {
      if (checkbox.checked) {
        recipients.set(value.username, value.pub_key);
      } else {
        recipients.delete(value.username);
      }

      const message_thing =
        recipients.size === 0
          ? "room"
          : recipients.size === 1
          ? recipients.keys().next().value
          : `${recipients.size} recipients`;
      document
        .getElementById("msg_content")
        .setAttribute("placeholder", "Message " + message_thing);
    };

    const name = document.createElement("p");
    name.innerText = value.username;

    elem.append(checkbox, name);
    nodes.push(elem);
  }

  list.replaceChildren(...nodes);
}

/**
 *
 * @param {{ username: string, pub_key?: string }[]} users
 * @returns
 */
async function setup_key_selection() {
  console.log("ACTIVE_USERS", Array.from(active_users.values()));
  update_key_list(active_users.values());
}

document.addEventListener("DOMContentLoaded", function () {
  init_toast();
  setup_enviroment();
  start_check_encr_server_status_interval();
  handle_text_area();

  const rdy_interval = setInterval(() => {
    if (ws.readyState == 1) {
      ws.send(JSON.stringify({ username }));
      ws.send(JSON.stringify({ request_active_users: true }));
      clearInterval(rdy_interval);
    }
  }, 500);

  document.getElementById("send_chat_btn").onclick = handle_send_chat;
});
