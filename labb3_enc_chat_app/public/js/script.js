const ws = new WebSocket(`ws://${window.document.location.host}`);
let username_is_available = false;

ws.onopen = function () {
  console.log("Websocket connection opened");
};
ws.onclose = function () {
  console.log("Websocket connection closed");
};

/**
 *
 * @param {{ err_msg: string, title: string  }} msg
 */
function handle_error(msg) {
  alert(msg.err_msg);
}

function span(text) {
  const s = document.createElement("span");
  s.innerText = text;
  return s;
}

function b(text) {
  const s = document.createElement("b");
  s.innerText = text;
  return s;
}

function time(time = new Date()) {
  const s = document.createElement("time");
  s.dateTime = time;
  s.innerText = ` at ${time.getHours().toString().padStart(2, "0")}:${time
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  return s;
}

/**
 *
 * @param {{ username: string, colour: string }} user_info
 */
function create_msg_meta_row(user_info) {
  const container = document.createElement("p");
  container.classList = "msg_meta";
  container.append(b(user_info.username), time());

  return container;
}

/**
 *
 * @param {HTMLDivElement} msgDiv
 * @param {{ user: { username: string, colour: string }, message: string }} msg
 */
function render_message(msgDiv, msg) {
  msgDiv.style.backgroundColor = msg.user.colour;

  msgDiv.innerText = msg.message;

  msgDiv.append(create_msg_meta_row(msg.user));
}

/**
 *
 * @param {HTMLDivElement} msgDiv
 * @param {{ user: string, message: string }} msg
 */
function render_system_message(msgDiv, msg) {
  msgDiv.classList.add("sys_msg");
  msgDiv.innerText = msg.message;
}

ws.onmessage = function (message) {
  var json = JSON.parse(message.data);

  if ("error" in json) {
    return handle_error(json.error);
  }

  if ("is_avalible" in json) {
    username_is_available = json.is_avalible;
    const username_status = document.getElementById("username_status");
    const username_state_as_text = username_is_available
      ? "available"
      : "taken";
    username_status.className = username_state_as_text;
    username_status.replaceChildren(
      span("username "),
      b(json.username),
      span(` is ${username_state_as_text}`)
    );
    return;
  }

  const msgDiv = document.createElement("div");
  msgDiv.classList.add("msgCtn");

  if (typeof json?.user === "object") {
    render_message(msgDiv, json);
  } else {
    render_system_message(msgDiv, json);
  }

  //Se till att informationen som vi tar emot från servern läggs till i konstanten/diven msgDiv.
  document.getElementById("messages").appendChild(msgDiv);
  chat_div.scrollTop = chat_div.scrollHeight;
};

const user_div = document.getElementById("set_username");
const chat_div = document.getElementById("chat");
const userform = document.getElementById("userForm");
const msgform = document.getElementById("msgForm");

userform.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = userform.querySelector("#userinputBox").value;

  if (!username_is_available && username) return;

  let user = new Object();
  user.username = username;
  ws.send(JSON.stringify(user));
  user_div.style.display = "none";
  chat_div.style.display = "flex";
});

let last_event;
userform.addEventListener("keyup", (_event) => {
  const username = userform.querySelector("#userinputBox").value;
  if (last_event) {
    clearTimeout(last_event);
  }

  last_event = setTimeout(function () {
    ws.send(JSON.stringify({ check_availible: username }));
  }, 200);
});

msgform.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = document.getElementById("messageinputBox").value;

  const msg_obj = { content: message };
  ws.send(JSON.stringify(msg_obj));
  //Skriv kod som gör att vi skickar meddelandet till servern
  //Se till att meddelandet har korrekt format
  //Ett tips är att utgå från koden ovan där vi skickar ett användarnamn till servern
  document.getElementById("messageinputBox").value = "";
});
msgform.addEventListener("reset", (event) => {
  ws.close();
});
