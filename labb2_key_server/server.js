var express = require("express"); // Popular web framework for Node.js
var bodyParser = require("body-parser"); // Auto parses body of post and put requests
var morgan = require("morgan"); // Logs HTTP requests to the console
var sqlite3 = require("sqlite3").verbose(); // SQLite client for Node.js
var app = express();
const cors = require("cors");
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.static("static")); // makes the files in /static folder available
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan("dev"));

let db = new sqlite3.Database(
  "./repo.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.log("Getting error " + err);
      exit(1);
    }
  }
);

// Se till att tabellen finns i databasen
db.run(
  "CREATE TABLE IF NOT EXISTS users (user TEXT PRIMARY KEY, pubkey TEXT NOT NULL)"
);

var port = process.argv[2] || 8888;
// HTTP SERVER
app.listen(port, function () {
  console.log("app listening on port " + port + "!");
});

// HOME PAGE
app.get("/", function (request, response) {
  response.sendFile(__dirname + "/index.html");
});

// API ENDPOINTS

app.get("/api/test/pubkeys", function (request, response) {
  response.json(secureStore.getAll());
});

app.get("/api/test/pubkeys/:name", function (request, response) {
  var user = request.params.name;
  console.log(request.params);
  let result = secureStore.getOne(request.params.name);
  if (result == null) {
    response.status(404).json("User not found");
    return;
  }
  response.json(result);
});

app.post("/api/pubkeys", function (request, response) {
  const { public_key, username } = request.body;
  if (!public_key || !username) return response.sendStatus(400);

  db.run("INSERT INTO users VALUES(?,?)", [username, public_key], (err) => {
    if (err?.code === "SQLITE_CONSTRAINT") {
      return response.sendStatus(409);
    }
    if (err) {
      console.log(err);
      return response.status(500).json("something went wrong");
    }

    response.sendStatus(201);
  });
});

app.get("/api/pubkeys", function (_request, response) {
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) return response.status(500).json("Something went wrong");
    response.json(rows ?? []);
  });
});

app.get("/api/pubkeys/:name", function (request, response) {
  var name = request.params.name;
  if (!name) return response.sendStatus(400);

  db.get("SELECT * FROM users WHERE user = ?", [name], (err, row) => {
    if (err) return response.status(500).json("Something went wrong");
    if (!row) return response.status(404).json("User not found");
    response.json(row);
  });
});

app.delete("/api/pubkeys/:name", function (request, response) {
  var name = request.params.name;
  if (!name) return response.sendStatus(400);

  db.run("DELETE FROM users WHERE user = ?", [name], (err) => {
    if (err) return response.sendStatus(500);
    response.sendStatus(200);
  });
});

const secureStore = (function () {
  const _data =
    "W3sidXNlciI6Imt1cnQiLCJwdWJrZXkiOiItLS0tLUJFZ0lOIFBVQkxJQyBLRVktLS0tLVxuTUlHZk1BMEdDU3FHU0liM0RRRUJBUVVBQTRHTkFEQ0JpUUtCZ1FDdGxtR3JHd0tLU2pVTzdSd3FaeXVZK3R0OTZcbllud052TzZIQ1RxNStwaE5Cd0ZYckFYaUV6V0RxdHd3MWZhdXlnTmRpYUlBSENrUkhrd09kV05RSHFZbTRZaVxuQ2JIdEt2U2VXT1FGc1dmYjJIZ1crYnJpa3NYZ1c2UnUxY0VvSGkxRHF6VmsvSDIvTDBaaSs1TFJxV3BEdkZXQlxubVVDVWU3R1lRMlJUWE1rK0lRSURBUUFCXG4tLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0ifSx7InVzZXIiOiJsYWJhbiIsInB1YmtleSI6Ii0tLS0tQkVHSU4gUFVCTElDIEtFWS0tLS0tXG5NSUdmTUEwR0NTcUdTSWIzRFFFQkFRVUFBNEdOQURDQmlRd0dCQ0RmYkdvd05sS0ZEL0JSVXNwQ0hrZHIvellcblBUNy9GY3hzOXpjQnAzOG5zM3FVK0VYcXlLWDBlNEpNUUM3TjNRWlJQRDUrZ2N5ZmUxaXhUZ3BqUWFJQ0tJWk0wXG43cTdPRjJlSDA3SlEzVHRuUDBNcTVxVlFFdXlGanBJYXpjTThCKy9DaGFtM2pzNEtXQWdUemVMM2NiT3Bjc0VPXG5GKytCU0dZRklSaUt2K1pEb1FJREFRQUJcbi0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLSJ9XQ==";

  const _dec = () => JSON.parse(Buffer.from(_data, "base64").toString());

  return {
    getAll: () => _dec(),
    getOne: (u) => _dec().find((x) => x.user === u) || null,
  };
})();
