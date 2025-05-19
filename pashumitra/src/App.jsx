import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { routes } from './router';
import { Toaster } from './components/ui/sonner';

const App = () => {
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