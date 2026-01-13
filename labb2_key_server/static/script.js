import {
  add_toast,
  init_toast,
  add_toast_from_error,
  gen_toast,
} from "./toast.js";

const API_BASE = "http://localhost:8888";
let INITIATED_FROM_POPUP = false;

function get_value_from_id(node_id, as_elem = false) {
  if (typeof node_id === "string")
    return as_elem
      ? document.getElementById(node_id)
      : document.getElementById(node_id).value;
  else if (Array.isArray(node_id))
    return node_id.map((id) =>
      as_elem ? document.getElementById(id) : document.getElementById(id).value
    );
  else return null;
}

function send_user_data() {
  const [username, public_key, private_key] = get_value_from_id([
    "userName",
    "publicKey",
    "privateKey",
  ]);

  if (!username || !public_key)
    return alert(`username or public key were null!`);

  fetch(`${API_BASE}/api/pubkeys`, {
    method: "POST",
    body: JSON.stringify({ username, public_key }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(async (res) => {
      if (res.status === 201) {
        if (INITIATED_FROM_POPUP) {
          window.opener.postMessage(
            {
              type: "KEY_EXPORT",
              key: private_key,
            },
            "*"
          );
          window.close();
        }

        gen_toast("Key Added!", "success", 5000);
      } else {
        if (res.status === 409) {
          // conflict: user alr exists
          add_toast_from_error(new Error(`User '${username}' already exists!`));
        } else {
          add_toast_from_error(
            new Error(`${res.status} error: ${res.statusText}`)
          );
        }
      }
    })
    .catch((e) => {
      alert("e");
      console.error(e);
      add_toast_from_error(e);
    });
}

export function generate_keys() {
  const [private_key, public_key] = get_value_from_id(
    ["privateKey", "publicKey"],
    true
  );

  const crypt = new JSEncrypt();
  const key = crypt.getKey();
  public_key.value = key.getPublicKey();
  private_key.value = key.getPrivateKey();
}

document.addEventListener("DOMContentLoaded", () => {
  const search_params = new URLSearchParams(location.search);
  const username = search_params.get("username");

  if (username) {
    INITIATED_FROM_POPUP = true;
    const username_elem = document.getElementById("userName");
    username_elem.value = username;
    username_elem.setAttribute("disabled", "true");
    generate_keys();
  }

  document.getElementById("gen_keys_btn").onclick = generate_keys;

  document.getElementById("userForm").onsubmit = (e) => {
    e.preventDefault();
    if (e.submitter instanceof HTMLInputElement) send_user_data();
  };

  init_toast();
});
