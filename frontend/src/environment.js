// Backend / Socket.io server URL.
// - If REACT_APP_API_URL is set, it is always used (good for ngrok or production).
// - Otherwise in dev we use current host + port 8000 so localhost works.
const getServerURL = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const port = 8000;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:${port}`;
  }
  return "http://localhost:8000";
};

const server = getServerURL();
if (typeof window !== "undefined") console.log("Backend URL:", server);
export default server;
