'use client';

import { useState, useEffect } from 'react';

export default function ThemeTest() {
  const [darkMode, setDarkMode] = useState(false);
  const [themeClass, setThemeClass] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    console.log('ThemeTest - Loading saved theme:', savedTheme);
    
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
      setThemeClass('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
      setThemeClass('');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    console.log('ThemeTest - Toggling theme from', darkMode, 'to', newDarkMode);
    
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setThemeClass('dark');
      console.log('ThemeTest - Applied dark theme');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setThemeClass('');
      console.log('ThemeTest - Applied light theme');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Theme Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p>Current theme: <strong>{darkMode ? 'Dark' : 'Light'}</strong></p>
            <p>Theme class: <strong>"{themeClass}"</strong></p>
            <p>HTML class: <strong>"{document.documentElement.className}"</strong></p>
          </div>
          
          <button
            onClick={toggleTheme}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Toggle Theme ({darkMode ? '☀️' : '🌙'})
          </button>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold">Light Mode Colors</h3>
              <div className="space-y-2 mt-2">
                <div className="h-4 bg-gray-50 rounded"></div>
                <div className="h-4 bg-gray-100 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-600 rounded-lg">
              <h3 className="font-semibold text-white">Dark Mode Colors</h3>
              <div className="space-y-2 mt-2">
                <div className="h-4 bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-800 rounded"></div>
                <div className="h-4 bg-gray-900 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 