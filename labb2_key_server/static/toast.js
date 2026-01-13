let parent;

function _setup_toast_container() {
  const c = document.createElement("div");
  c.id = "TOAST_CONTAINER";
  document.body.prepend(c);
  return c;
}

/**
 *
 * @param {string} message
 * @param {"info"|"error"|"success"} type
 * @param {number} timeout
 */
export function gen_toast(message, type, timeout = 3000) {
  if (!parent) return;
  const t = document.createElement("div");
  t.classList.add("toast", type);

  const label = document.createElement("small");
  label.innerText = type;

  const msg = document.createElement("p");
  msg.innerText = message;

  t.append(label, msg);

  parent.append(t);

  setTimeout(() => {
    t.remove();
  }, timeout);
}

/**
 *
 * @param {Error} error
 * @param {number} timeout
 */
export function add_toast_from_error(error, timeout) {
  gen_toast(error.message, "error", timeout);
}

/**
 *
 * @param {string} message
 */
export function add_toast(message, timeout) {
  gen_toast(message, "info", timeout);
}

export function init_toast() {
  parent =
    document.getElementById("TOAST_CONTAINER") || _setup_toast_container();
}
