import React, { useRef, useState } from 'react';
import { Button, Space, Slider, Typography, theme } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface VideoPlayerProps {
  url: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

/**
 * VideoPlayer Component
 *
 * Basic HTML5 video player with controls:
 * - Play/Pause
 * - Timeline scrubbing
 * - Volume control
 * - Fullscreen
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  onTimeUpdate,
  onPlay,
  onPause,
}) => {
  const { token } = theme.useToken();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  // Cleanup: pause video when component unmounts
  React.useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onPause && onPause();
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      onPlay && onPlay();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate && onTimeUpdate(time);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value / 100;
    setVolume(value);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%', background: token.colorBgBase, borderRadius: token.borderRadiusLG }}>
      <video
        ref={videoRef}
        src={url}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '70vh',
          display: 'block',
          borderRadius: '8px 8px 0 0',
          objectFit: 'contain'
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Controls */}
      <div
        style={{
          padding: '12px 16px',
          background: token.colorBgElevated,
          borderRadius: `0 0 ${token.borderRadiusLG}px ${token.borderRadiusLG}px`,
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {/* Timeline */}
          <Slider
            value={currentTime}
            max={duration}
            step={0.1}
            onChange={handleSeek}
            tooltip={{
              formatter: (value) => formatTime(value || 0),
            }}
            style={{ margin: 0 }}
          />

          {/* Control Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {/* Play/Pause */}
              <Button
                type="text"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
                style={{ color: 'white', fontSize: 24 }}
              />

              {/* Time Display */}
              <Text style={{ color: 'white', fontSize: 12 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
            </Space>

            <Space>
              {/* Volume */}
              <SoundOutlined style={{ color: 'white' }} />
              <Slider
                value={volume}
                onChange={handleVolumeChange}
                style={{ width: 100, margin: 0 }}
                tooltip={{
                  formatter: (value) => `${value}%`,
                }}
              />

              {/* Fullscreen */}
              <Button
                type="text"
                icon={<FullscreenOutlined />}
                onClick={handleFullscreen}
                style={{ color: 'white' }}
              />
            </Space>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default VideoPlayer;
