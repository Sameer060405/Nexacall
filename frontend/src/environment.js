// App server base URL from environment variable
const isProd = process.env.NODE_ENV === "production";

// Hosted backend (used in production builds, e.g. on Vercel)
const RENDER_BACKEND_URL = "https://nexacall-si3n.onrender.com";

const getServerURL = () => {
  if (isProd) {
    return process.env.REACT_APP_API_URL || RENDER_BACKEND_URL;
  }

  const host = window.location.hostname;
  const port = 8000;
  const protocol = window.location.protocol;

  return `${protocol}//${host}:${port}`;
};

const server = getServerURL();
console.log('Server URL:', server);
export default server;
