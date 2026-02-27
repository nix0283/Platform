'use client';
import { useState, useEffect } from 'react';

export function useCurrentTime() {
  const [time, setTime] = useState('');
  
  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toISOString().split('T')[1].split('.')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return time;
}
