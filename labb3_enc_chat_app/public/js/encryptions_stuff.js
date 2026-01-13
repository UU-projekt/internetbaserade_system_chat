const API_BASE = "http://localhost:8888";

export function check_server_health() {
  return new Promise((resolve) => {
    fetch(`${API_BASE}/health`)
      .then((r) => {
        if (r.ok) resolve(true);
        else resolve(false);
      })
      .catch((_e) => resolve(false));
  });
}
