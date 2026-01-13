export const ws = new WebSocket(`ws://${window.document.location.host}`);
const listeners = [];

ws.onopen = function () {
  console.log("Websocket connection opened");
};
ws.onclose = function () {
  console.log("Websocket connection closed");
};

/**
 *
 * @param {(ev: { event: string }) => void} listener
 */
export function add_msg_listener(listener) {
  listeners.push(listener);
}

ws.onmessage = (msg) => {
  const json = JSON.parse(msg.data);
  if (!("event" in json)) return;

  listeners.forEach((l) => l(json));
};
