const server =
  window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://videochatbackend-qbpq.onrender.com";

export default server;
