// App server base URL from environment variable
const isProd = process.env.NODE_ENV === "production";
const server =  isProd ? process.env.REACT_APP_API_URL : "http://localhost:8000";
console.log('Server URL:', server);
export default server;
