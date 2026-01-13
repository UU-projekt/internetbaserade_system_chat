const http = require("http");
const sh = require("serve-handler");
const ws = require("ws");

let count = 0;
const server = http.createServer((req, res) => {
  return sh(req, res, { public: "public" });
});

const active_users = new Map();

const wss = new ws.WebSocketServer({ server });

function gen_username() {
  return `user_${++count}`;
}

const KEY_SERVER_URL = "http://localhost:8888";
/**
 *
 * @param {string} username
 */
function fetch_user_pub_key(username) {
  // /api/pubkeys/:name
  return new Promise((resolve, reject) => {
    fetch(`${KEY_SERVER_URL}/api/pubkeys/${username}`)
      .then((r) => {
        if (!r.ok) return reject(new Error("Pub Key server is ANGRY!!!!!!!"));
        r.json().then(resolve).catch(reject);
      })
      .catch(reject);
  });
}

wss.on("connection", (client) => {
  const send_err = send_err_builder(client);
  console.log("Client connected!");
  client.on("message", async (json) => {
    console.log("Message: " + json);

    let msg = JSON.parse(json);
    if ("username" in msg) {
      const username_is_empty =
        !msg.username || msg.username.trim().length == 0;
      const set_username = username_is_empty ? gen_username() : msg.username;

      if (active_users.has(set_username)) {
        return send_err(
          `Username '${set_username}' is already taken.`,
          "Identity Theft"
        );
      }
      const pub_key = await fetch_user_pub_key(set_username).catch((e) =>
        console.warn(`Could not get pub key for '${set_username}'`, e)
      );
      active_users.set(set_username, {
        username: set_username,
        pub_key: pub_key?.pubkey,
      });
      client.username = set_username;

      client.colour = getDarkColor();

      broadcast(
        { username: set_username, pub_key: pub_key?.pubkey },
        "CLIENT_JOINED"
      );

      client.send(
        JSON.stringify({
          username: client.username,
          event: "CONF_REGISTRATION",
        })
      );
    } else if ("announce_arrival" in msg && client.username) {
      send_as_system(`${client.username} has entered the chat!`, "USER_JOINED");
    } else if ("request_active_users" in msg) {
      client.send(
        JSON.stringify({
          active_clients: Array.from(active_users.entries()),
          event: "SYNC_USERS",
        })
      );
    } else if ("content" in msg) {
      if (!("username" in client)) {
        return send_err("you've no username", "PLEASE_REREG");
      }

      if (typeof msg.content !== "string" || msg.content.trim().length === 0) {
        return send_err("you cant send empty messages!");
      }
      const { username, colour } = client;
      const msg_obj = {
        user: { username, colour },
        message: msg.content,
        encryption: msg?.encryption,
      };

      broadcast(msg_obj, "MESSAGE");
    } else if ("check_availible" in msg) {
      const is_avalible = !active_users.has(msg.check_availible);
      client.send(
        JSON.stringify({
          is_avalible,
          username: msg.check_availible,
          event: "CHK_AVAILABLE",
        })
      );
    }
  });

  client.on("close", () => {
    console.log(`${client.username ?? "Client"} disconnected.`); //Funkar endast på senare version av Node än den som finns på labbservern

    if (client.username) {
      const user_obj = active_users.get(client.username);
      broadcast(user_obj, "CLIENT_LEFT");
      active_users.delete(client.username);
    }
  });
});

function send_as_system(message) {
  broadcast({ user: "System", message }, "MESSAGE");
}

function send_err_builder(client) {
  return function (err_msg, title = "Error") {
    if (!err_msg) throw new Error("We cant have empty error messages");
    client.send(JSON.stringify({ error: { err_msg, title }, event: "ERROR" }));
  };
}

/**
 *
 * @param {string|Object} msg
 */
function broadcast(msg, event_name) {
  const msg_to_broadcase =
    typeof msg === "string"
      ? msg
      : JSON.stringify({ event: event_name, ...msg });
  for (const client of wss.clients) {
    if (client.readyState === ws.OPEN) {
      client.send(msg_to_broadcase);
    }
  }
}
function getDarkColor() {
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += Math.floor(Math.random() * 10);
  }
  return color;
}

server.listen(process.argv[2] || 8080, () => {
  console.log(
    `Server listening on port ${server._connectionKey.split("::::")[1]}...`
  );
});
