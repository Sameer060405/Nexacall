import axios from 'axios';
import server from '../environment';

const API_URL = `${server}/api/v1/recordings`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const uploadRecording = async (blob, { meetingCode = '', title = 'Meeting recording', durationSeconds = 0 } = {}) => {
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  formData.append('meetingCode', meetingCode);
  formData.append('title', title);
  formData.append('durationSeconds', String(durationSeconds));

  const { data } = await axios.post(API_URL, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return data;
};

export const getRecordings = async () => {
  const { data } = await axios.get(API_URL, { headers: getAuthHeaders() });
  return data;
};

export const getRecordingStreamBlob = async (recordingId) => {
  const token = localStorage.getItem('jwt_token');
  if (!token) throw new Error('Please sign in to play or download recordings.');
  const id = typeof recordingId === 'string' ? recordingId : (recordingId?.toString?.() || String(recordingId));
  const url = `${API_URL}/${id}/file`;
  const res = await axios.get(url, {
    responseType: 'blob',
    headers: getAuthHeaders(),
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    let message = 'Failed to load recording.';
    if (res.data instanceof Blob && res.data.type?.includes('json')) {
      try {
        const text = await res.data.text();
        const json = JSON.parse(text);
        if (json.error) message = json.error;
      } catch (_) {}
    }
    const err = new Error(message);
    err.response = res;
    throw err;
  }
  if (!(res.data instanceof Blob) || res.data.size === 0) {
    throw new Error('Recording file is empty or invalid.');
  }
  return res.data;
};

export default {
  uploadRecording,
  getRecordings,
  getRecordingStreamBlob,
};
