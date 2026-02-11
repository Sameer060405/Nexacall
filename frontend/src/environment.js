// App server base URL from environment variable
const isProd = process.env.NODE_ENV === "production";

// Dynamically determine the backend URL based on the current host
// This allows the app to work when accessed from different devices
const getServerURL = () => {
  if (isProd) {
    return process.env.REACT_APP_API_URL;
  }
  
  const host = window.location.hostname;
  const port = 8000;
  const protocol = window.location.protocol;
  
  return `${protocol}//${host}:${port}`;
};

const server = getServerURL();
console.log('Server URL:', server);
export default server;
