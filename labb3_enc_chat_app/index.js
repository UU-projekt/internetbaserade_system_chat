const http = require("http");
const sh = require("serve-handler");
const ws = require("ws");

let count = 0;
const server = http.createServer((req, res) => {
  return sh(req, res, { public: "public" });
});

const seen_usernames = new Set();

const wss = new ws.WebSocketServer({ server });

function gen_username() {
  return `user_${++count}`;
}

wss.on("connection", (client) => {
  const send_err = send_err_builder(client);
  console.log("Client connected!");
  client.on("message", (json) => {
    console.log("Message: " + json);

    let msg = JSON.parse(json);
    if ("username" in msg) {
      const username_is_empty = msg.username.trim().length == 0;
      const set_username = username_is_empty ? gen_username() : msg.username;

      if (seen_usernames.has(set_username)) {
        return send_err(
          `Username '${set_username}' is already taken.`,
          "Identity Theft"
        );
      }

      seen_usernames.add(set_username);
      client.username = set_username;

      client.colour = getDarkColor();

      send_as_system(`${client.username} has entered the chat!`);
    } else if ("content" in msg && "username" in client) {
      if (typeof msg.content !== "string" || msg.content.trim().length === 0) {
        return send_err("you cant send empty messages!");
      }
      const { username, colour } = client;
      const msg_obj = {
        user: { username, colour },
        message: msg.content,
      };

      broadcast(msg_obj);
    } else if ("check_availible" in msg) {
      const is_avalible = !seen_usernames.has(msg.check_availible);
      client.send(
        JSON.stringify({ is_avalible, username: msg.check_availible })
      );
    }
  });

  client.on("close", () => {
    console.log(`${client.username ?? "Client"} disconnected.`); //Funkar endast på senare version av Node än den som finns på labbservern

    if (client.username) {
      send_as_system(`${client.username} has left the chat :(`);
      seen_usernames.delete(client.username);
    }
  });
});

function send_as_system(message) {
  broadcast({ user: "System", message });
}

function send_err_builder(client) {
  return function (err_msg, title = "Error") {
    if (!err_msg) throw new Error("We cant have empty error messages");
    client.send(JSON.stringify({ error: { err_msg, title } }));
  };
}

/**
 *
 * @param {string|Object} msg
 */
function broadcast(msg) {
  const msg_to_broadcase = typeof msg === "string" ? msg : JSON.stringify(msg);
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
