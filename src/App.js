import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { drawKeypoints, drawSkeleton as drawSkeletonLines } from './utilities';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [drawSkeleton, setDrawSkeleton] = useState(true); // State to control skeleton drawing


  // Load MoveNet model
  useEffect(() => {
    const loadModel = async () => {
      await tf.setBackend('webgl');
      await tf.ready();
      const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
      setModel(detector);
    };
    loadModel();
  }, []);

  // Draw results - Memoize with useCallback
  const drawResults = useCallback((poses) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (drawSkeleton) {
      for (const pose of poses) {
        drawKeypoints(pose.keypoints, 0.5, ctx);
        drawSkeletonLines(pose.keypoints, 0.5, ctx);
      }
    }
  }, [drawSkeleton]);

  // Pose detection function - Memoize with useCallback
  const detectPose = useCallback(async () => {
    if (webcamRef.current && model) {
      const video = webcamRef.current.video;
      const poses = await model.estimatePoses(video, { flipHorizontal: false });
      drawResults(poses);
    }
  }, [model, drawResults]);


  // Function to clear the canvas
  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  // Toggle camera feed
  const toggleCamera = () => {
    setIsCameraActive(!isCameraActive);

    if (isCameraActive) {
      // If turning off the camera, clear the canvas
      clearCanvas();
    }
  };

  // Toggle skeleton drawing
  const toggleSkeletonDrawing = () => {
    setDrawSkeleton(!drawSkeleton);
  };

  // Run pose detection only when camera is active
  useEffect(() => {
    if (!isCameraActive) return;

    const video = webcamRef.current && webcamRef.current.video;
    if (video && video.readyState === 4) {
      // Video is ready, set canvas size and start pose detection
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;

      const interval = setInterval(() => {
        detectPose();
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isCameraActive, detectPose]);

  return (
    <div className="App">
      <header className="App-header">
        <div style={{ position: 'relative', width: '640px', height: '480px' }}>
          {isCameraActive && <Webcam ref={webcamRef} style={{ width: '100%', height: '100%' }} />}
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>
        <button onClick={toggleCamera} style={{ marginTop: '10px' }}>
          {isCameraActive ? "Stop Camera" : "Start Camera"}
        </button>
        <button onClick={toggleSkeletonDrawing} style={{ marginTop: '10px' }}>
          {drawSkeleton ? "Hide Skeleton" : "Show Skeleton"}
        </button>
      </header>
    </div>
  );
}

export default App;