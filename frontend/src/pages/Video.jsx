import React, { useRef, useEffect } from 'react';

const Video = ({ stream }) => {
  const videoRef = useRef();

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      el.srcObject = stream;
    }
    return () => {
      if (el) {
        el.srcObject = null;
      }
    };
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