import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './VideoPlayer.css';

export default function VideoPlayer({ src, file, dark, onNext }) {
  const videoRef = useRef(null);
  const subtitleInputRef = useRef(null);
  const playerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [userActive, setUserActive] = useState(true);

  // Keep a stable ref to onNext to avoid deep useEffect triggers when parent re-renders
  const onNextRef = useRef(onNext);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);

  const isLarge = file?.fileSize > 200 * 1024 * 1024;

  useEffect(() => {
    // Only initialize once
    if (!playerRef.current) {
      if (!videoRef.current) return;

      // Revert to `<video-js>` wrapper because raw `<video>` crashes the Video.js initialization pipeline in React.
      const videoElement = document.createElement("video-js"); 
      
      videoElement.classList.add("vjs-big-play-centered", "vjs-telecloud-skin");
      if (dark) videoElement.classList.add("vjs-theme-dark");
      
      // CRITICAL FOR PLAYBACK SPEED & CHROME LIVE CAPTIONS:
      // Chrome natively disables "Live Captions" and "PlaybackRate" on 'tainted' audio streams.
      videoElement.setAttribute("crossorigin", "anonymous");

      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, {
        crossOrigin: 'anonymous', 
        html5: {
          vhs: { overrideNative: false }
        },
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: false, 
        fill: true,
        preload: 'auto',
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        controlBar: {
          pictureInPictureToggle: true,
          playbackRateMenuButton: true,
        },
        sources: [{ src, type: 'video/mp4' }] 
      }, () => {
        // CRITICAL BUGFIX: We CANNOT set currentTime statically on init.
        // We MUST wait for the browser to pull enough metadata bytes to know the timeline length!
        player.one('loadedmetadata', () => {
          setLoading(false);
          
          // FORCE crossorigin onto the actual inner <video> tag after Video.js creates it
          const innerVideo = videoRef.current?.querySelector('video');
          if (innerVideo) {
            innerVideo.setAttribute('crossorigin', 'anonymous');
          }
          
          if (file?._id) {
            const savedTime = localStorage.getItem(`videoProgress_${file._id}`);
            if (savedTime && parseFloat(savedTime) > 0) {
              player.currentTime(parseFloat(savedTime));
            }
          }
        });
      });

      // Sync React state to Video.js idle detection
      player.on('useractive', () => setUserActive(true));
      player.on('userinactive', () => setUserActive(false));

      // Mid-stream buffering indicators
      player.on('waiting', () => { /* let default spinner shine */ });

      // BULLETPROOF SPEED FIX: Directly mutate the native <video> element's playbackRate
      // Video.js's internal tech wrapper can silently swallow playbackRate changes.
      // We bypass it entirely by reaching into the raw DOM.
      player.on('ratechange', () => {
        const rate = player.playbackRate();
        const innerVideo = videoRef.current?.querySelector('video');
        if (innerVideo && innerVideo.playbackRate !== rate) {
          innerVideo.playbackRate = rate;
        }
      });
      
      // Also set speed on any click of the rate menu items
      // This catches edge cases where Video.js fires the menu click but not ratechange
      player.ready(() => {
        const innerVideo = videoRef.current?.querySelector('video');
        if (innerVideo) {
          // Periodically sync speed (catches all edge cases)
          const speedSync = setInterval(() => {
            if (player.isDisposed()) { clearInterval(speedSync); return; }
            const vjsRate = player.playbackRate();
            if (innerVideo.playbackRate !== vjsRate) {
              innerVideo.playbackRate = vjsRate;
            }
          }, 500);
          player.on('dispose', () => clearInterval(speedSync));
        }
      });

      player.on('timeupdate', () => {
        if (file?._id && player.currentTime() > 5) {
          // If < 10 secs left, clear the memory so next replay starts fresh
          if (player.duration() - player.currentTime() < 10) {
            localStorage.removeItem(`videoProgress_${file._id}`);
          } else {
            localStorage.setItem(`videoProgress_${file._id}`, player.currentTime());
          }
        }
      });

      player.on('ended', () => {
        if (file?._id) localStorage.removeItem(`videoProgress_${file._id}`);
        if (onNextRef.current) onNextRef.current();
      });

      // Keyboard hotkeys
      const handleKeyDown = (e) => {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        switch(e.code) {
          case 'Space':
            e.preventDefault();
            if (player.paused()) player.play(); else player.pause();
            break;
          case 'ArrowRight':
            e.preventDefault();
            player.currentTime(player.currentTime() + 10);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            player.currentTime(player.currentTime() - 10);
            break;
          case 'ArrowUp':
            e.preventDefault();
            player.volume(Math.min(1, player.volume() + 0.1));
            break;
          case 'ArrowDown':
            e.preventDefault();
            player.volume(Math.max(0, player.volume() - 0.1));
            break;
          case 'KeyF':
            e.preventDefault();
            if (player.isFullscreen()) player.exitFullscreen(); else player.requestFullscreen();
            break;
          case 'KeyM':
            e.preventDefault();
            player.muted(!player.muted());
            break;
          default:
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      player.on('dispose', () => document.removeEventListener('keydown', handleKeyDown));
      
      // Mobile Double-Tap to Seek Logic
      let lastTap = 0;
      const handleTouch = (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
           const rect = videoRef.current.getBoundingClientRect();
           const touchX = e.touches[0].clientX - rect.left;
           if (touchX > rect.width / 2) {
             player.currentTime(player.currentTime() + 10);
           } else {
             player.currentTime(player.currentTime() - 10);
           }
           e.preventDefault();
        }
        lastTap = currentTime;
      };
      // We bind safely to the container
      if (videoRef.current) {
        videoRef.current.addEventListener('touchstart', handleTouch, { passive: false });
      }

      // Right-click security
      player.on('contextmenu', (e) => e.preventDefault());
      
      // AUTO-RECOVER LOGIC: 
      // If the backend stream drops the TCP socket abruptly (timeout/error),
      // Video.js halts indefinitely. We catch it, suppress the native fatal UI,
      // and silently hard-reload the stream, jumping directly to the crashed point!
      player.on('error', () => {
        const err = player.error();
        if (err && (err.code === 2 || err.code === 3 || err.code === 4)) {
           // Network Drop (2), Decode Pipeline (3), Source not supported (4 - transient)
           const crashedTime = player.currentTime();
           player.error(null); // suppress fatal UI
           
           // Show loader
           setLoading(true);
           
           setTimeout(() => {
             player.src({ src, type: 'video/mp4' });
             player.one('loadedmetadata', () => {
               setLoading(false);
               player.currentTime(crashedTime);
               player.play();
             });
           }, 1000);
        } else {
           setLoading(false);
        }
      });

    } else {
      // If src ACTUALLY changed (e.g. user clicked next video in carousel)
      const player = playerRef.current;
      if (player.currentSrc() !== src) {
        player.src({ src, type: 'video/mp4' });
        player.play();
      }
    }
  }, [src, file?._id]);

  // Teardown
  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  const handleSubtitleUpload = (e) => {
    const fileEvent = e.target.files[0];
    if (!fileEvent) return;
    const url = window.URL.createObjectURL(fileEvent);
    const player = playerRef.current;
    
    player.addRemoteTextTrack({
      kind: 'captions',
      label: fileEvent.name,
      srclang: 'en',
      src: url,
      default: true
    }, true);

    setTimeout(() => {
      const tracks = player.textTracks();
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].label === fileEvent.name) tracks[i].mode = 'showing';
      }
    }, 100);
  };

  return (
    <div className="group w-full h-full flex items-center justify-center relative overflow-hidden" 
         onContextMenu={(e) => e.preventDefault()}>
      
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] bg-black bg-opacity-95 backdrop-blur-lg">
          <div className="w-10 h-10 border-4 rounded-full animate-spin border-white/20 border-t-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.5)] mb-6"/>
          {isLarge && (
            <p className="max-w-xs text-center px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white/95 text-sm font-medium tracking-wide shadow-2xl border border-white/10">
              Large file network discovery...<br/><span className="text-white/60 text-xs font-normal">Please wait a moment while the stream stabilizes.</span>
            </p>
          )}
        </div>
      )}
      
      
      {/* Hidden File Input for Subtitles */}
      <input type="file" ref={subtitleInputRef} accept=".vtt,.srt" className="hidden" onChange={handleSubtitleUpload}/>
      
      <div className={`absolute top-6 right-6 z-[50] flex items-center gap-2 transition-all duration-500 ${userActive && !loading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <button onClick={(e) => {
                  e.stopPropagation();
                  alert("To enable Chrome's built-in Auto Captions (AI Live Translate):\n\n1. Open Chrome Settings\n2. Search for 'Live Caption'\n3. Toggle it ON\n\nChrome will instantly generate highly accurate live captions for any playing video on TeleCloud!");
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-500/80 hover:bg-blue-500 backdrop-blur-md text-white/95 text-xs font-bold border border-white/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-1.5 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v7h7"></path></svg>
          Auto CC
        </button>

        <button onClick={(e) => { e.stopPropagation(); subtitleInputRef.current.click(); }}
                className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/20 backdrop-blur-md text-white/90 text-xs font-semibold border border-white/10 shadow-lg flex items-center gap-1.5 transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><path d="M7 15h4M15 15h2M7 11h2M13 11h4"></path></svg>
          Load VTT
        </button>
      </div>

      <div className={`w-full h-full transition-opacity duration-700 ease-in-out ${loading ? 'opacity-0' : 'opacity-100'}`}>
        <div data-vjs-player className="w-full h-full" ref={videoRef} />
      </div>
    </div>
  );
}
