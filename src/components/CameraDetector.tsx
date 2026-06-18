/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { TrackedHand } from '../types';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

// ─── DYNAMIC SCRIPT LOADERS WITH DUAL CDN RESILIENCE ─────────────────
function loadScript(url: string, timeoutMs: number = 6000): Promise<void> {
  return new Promise((resolve, reject) => {
    // If script is already inserted with same source, skip duplicate injects
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      try {
        document.head.removeChild(script);
      } catch (err) {}
      reject(new Error(`加载脚本超时: ${url}`));
    }, timeoutMs);

    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timer);
      try {
        document.head.removeChild(script);
      } catch (err) {}
      reject(new Error(`加载脚本失败: ${url}`));
    };

    document.head.appendChild(script);
  });
}

async function loadMediaPipeLibsWithFallback(onProgress: (status: string) => void) {
  if (window.Hands && window.Camera) {
    return { baseUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands' };
  }

  const CDNS = [
    {
      name: 'jsDelivr 镜像库',
      cameraUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      handsUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
      baseUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
    },
    {
      name: 'Unpkg 容灾节点',
      cameraUrl: 'https://unpkg.com/@mediapipe/camera_utils/camera_utils.js',
      handsUrl: 'https://unpkg.com/@mediapipe/hands/hands.js',
      baseUrl: 'https://unpkg.com/@mediapipe/hands'
    }
  ];

  let lastError = null;
  for (const cdn of CDNS) {
    try {
      onProgress(`正在连接 ${cdn.name}...`);
      await loadScript(cdn.cameraUrl, 4000);
      await loadScript(cdn.handsUrl, 5000);
      
      if (window.Hands && window.Camera) {
        console.log(`[MediaPipe] 成功通过 ${cdn.name} 加载核心引擎部件.`);
        return { baseUrl: cdn.baseUrl };
      }
    } catch (err: any) {
      console.warn(`[MediaPipe] 线路 ${cdn.name} 失败, 正在切换到备用节点...`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('所有 CDN 节点均请求超时。请检查网络，或点击手动点拨按钮免摄像头运行。');
}

interface CameraDetectorProps {
  onHandsDetected: (hands: TrackedHand[]) => void;
  isActive: boolean;
}

export default function CameraDetector({ onHandsDetected, isActive }: CameraDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionState, setPermissionState] = useState<'pending' | 'allowed' | 'denied'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [loadingStatusText, setLoadingStatusText] = useState<string>('拉取 MediaPipe 手势资源...');
  const [isPipVisible, setIsPipVisible] = useState<boolean>(true);

  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive) return;

    let active = true;

    async function initWebcamAndTracking() {
      setIsInitializing(true);
      setErrorMessage('');

      // 1. Dynamic script loading with CDN fallbacks
      let HandsLib = window.Hands;
      let CameraLib = window.Camera;
      let selectedCDNBaseUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

      if (!HandsLib || !CameraLib) {
        try {
          const loadedInfo = await loadMediaPipeLibsWithFallback((status) => {
            if (active) setLoadingStatusText(status);
          });
          HandsLib = window.Hands;
          CameraLib = window.Camera;
          selectedCDNBaseUrl = loadedInfo.baseUrl;
        } catch (e: any) {
          if (active) {
            setPermissionState('denied');
            setErrorMessage(
              '加载手势识别库失败：网络连接较慢或部分 CDN 被拦截。建议点击“手动备份点拨开启”一键开启极速无摄像头互动模式。'
            );
            setIsInitializing(false);
          }
          return;
        }
      }

      if (!active) return;
      setLoadingStatusText('请求获取摄像头画面...');

      // 2. Progressive media constraints fallback for highest mobile compatibility
      try {
        const constraintOptions = [
          { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } },
          { video: { facingMode: 'user' } },
          { video: true }
        ];

        let stream: MediaStream | null = null;
        let lastStreamErr: any = null;

        for (const option of constraintOptions) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(option);
            if (stream) break;
          } catch (e) {
            lastStreamErr = e;
          }
        }

        if (!stream) {
          throw lastStreamErr || new Error('NotAllowedError');
        }

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPermissionState('allowed');
      } catch (err: any) {
        if (active) {
          setPermissionState('denied');
          
          let customMsg = '无法调用摄像头。';
          if (err.name === 'NotAllowedError' || err.message?.includes('denied') || err.message?.includes('Permission')) {
            customMsg = '浏览器摄像头权限被拒绝。如果您在嵌入的 Iframe 中运行，请务必点击主界面右上角的【新标签页独立打开 ↗】进行授权，或者在下方直接使用【手动备份点拨开启】模式免摄像头游玩。';
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            customMsg = '未能检测到您设备上的可用摄像头（无硬件或未正确插入）。您可以直接点击下方【手动备份点拨】启动键盘/触控/鼠标互动。';
          } else {
            customMsg = `摄像头连接故障: ${err.message || err.name}。建议点击下方的【手动点拨模式】跳过本阶段。`;
          }

          setErrorMessage(customMsg);
          setIsInitializing(false);
        }
        return;
      }

      if (!active) return;
      setLoadingStatusText('正在编译并预热神经网络...');

      try {
        // 3. Initialize MediaPipe Hands using corresponding CDN base
        const hands = new HandsLib({
          locateFile: (file: string) => `${selectedCDNBaseUrl}/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65
        });

        hands.onResults((results: any) => {
          if (!active) return;
          
          setIsInitializing(false);

          // Convert MediaPipe results to our TrackedHand format
          const formattedHands: TrackedHand[] = [];
          if (results.multiHandLandmarks && results.multiHandedness) {
            results.multiHandLandmarks.forEach((landmarks: any[], idx: number) => {
              const handedness = results.multiHandedness[idx];
              formattedHands.push({
                label: handedness.label === 'Left' ? 'Left' : 'Right',
                score: handedness.score,
                landmarks: landmarks.map((l: any) => ({
                  x: l.x,
                  y: l.y,
                  z: l.z
                }))
              });
            });
          }
          
          onHandsDetected(formattedHands);
        });

        handsInstanceRef.current = hands;

        // 4. Initialize MediaPipe Camera helper
        if (videoRef.current) {
          const camera = new CameraLib(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && active) {
                try {
                  await hands.send({ image: videoRef.current });
                } catch (e) {
                  // Catch frame sending error gracefully to prevent crash on page transitions
                }
              }
            },
            width: 640,
            height: 480
          });

          camera.start();
          cameraInstanceRef.current = camera;
        }

      } catch (err: any) {
        if (active) {
          setErrorMessage('初始化手手势识别算法失败: ' + err.message);
          setIsInitializing(false);
        }
      }
    }

    initWebcamAndTracking();

    return () => {
      active = false;
      // Cleanup camera stream
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (handsInstanceRef.current) {
        handsInstanceRef.current.close();
      }
    };
  }, [isActive]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* 1. Standard Error Overlay when camera path fails */}
      {permissionState === 'denied' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/90 pointer-events-auto p-6 text-center animate-fade-in">
          <div className="max-w-md bg-stone-900 border border-red-900/30 rounded-xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-stone-100 mb-3 font-sans">
              摄像头调用权限受限
            </h3>
            <p className="text-stone-400 text-sm leading-relaxed mb-6">
              {errorMessage}
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-gray-950 rounded-lg text-sm font-semibold transition-all shadow-lg active:scale-95"
              >
                在新标签页中独立打开 ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Loading state while loading models */}
      {permissionState === 'allowed' && isInitializing && (
        <div className="absolute bottom-6 left-6 pointer-events-auto">
          <div className="flex items-center gap-3 bg-stone-900/80 backdrop-blur-md border border-teal-500/20 px-4 py-2.5 rounded-xl shadow-lg">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500 animate-pulse"></span>
            </span>
            <span className="text-xs text-stone-300 font-mono">{loadingStatusText}</span>
          </div>
        </div>
      )}

      {/* 3. Small PIP Camera Preview component in the bottom-right corner */}
      {permissionState === 'allowed' && (
        <div className={`absolute bottom-6 right-6 pointer-events-auto transition-transform ${isPipVisible ? 'scale-100' : 'scale-0'}`}>
          <div className="relative w-48 h-36 bg-black rounded-lg overflow-hidden border border-stone-700/60 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {/* HUD Scan Line */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-500/5 to-transparent bg-[length:100%_4px] opacity-10" />
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-mono text-teal-400 border border-teal-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              VIDEO HUD FEED
            </div>
            <button
              onClick={() => setIsPipVisible(false)}
              className="absolute top-2 right-2 p-0.5 bg-black/60 rounded text-stone-400 hover:text-white transition-colors"
              title="隐藏预览"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 4. Restore PIP view button if minimized */}
      {permissionState === 'allowed' && !isPipVisible && (
        <button
          onClick={() => setIsPipVisible(true)}
          className="absolute bottom-6 right-6 pointer-events-auto bg-stone-900 border border-stone-700 hover:border-teal-500/50 p-2.5 rounded-full shadow-lg text-stone-400 hover:text-teal-400 transition-all flex items-center gap-1.5"
          title="展开摄像头画面"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-mono pr-1">WEBCAM PIP</span>
        </button>
      )}
    </div>
  );
}
