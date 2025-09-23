import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { routes } from './router';
import { Toaster } from './components/ui/sonner';

const App = () => {
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = saved === 'light' || saved === 'dark' ? saved : (prefersDark ? 'dark' : 'light');
    if (next === 'dark') document.documentElement.classList.add('dark');
  }, []);
  return (
    <>
      <BrowserRouter>
        <Routes>
            {routes.map(route => {
              return (
                <Route
                  key={route.name}
                  path={route.path}
                  element={<route.element />}
                />
              );
            })}
          <Route
            path='*'
            element={<p className='text-white-1'>404 Not Found</p>}
          />  
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
};

export default App;