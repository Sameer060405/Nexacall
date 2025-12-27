import React, { useRef, useEffect } from 'react';

const Video = ({ stream }) => {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-gray-800 rounded-lg overflow-hidden">
      <video
        className="w-full h-full object-cover"
        ref={videoRef}
        autoPlay
        playsInline
      ></video>
    </div>
  );
};

export default Video;