// Utility functions for JWT auth in frontend
export function setToken(token) { localStorage.setItem('jwt_token', token); }
export function getToken()     { return localStorage.getItem('jwt_token'); }
export function removeToken()  { localStorage.removeItem('jwt_token'); }
export function isAuthenticated(){ return !!getToken(); }
