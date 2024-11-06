import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import RegularView from './views/RegularView/RegularView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<Layout/>}>
          <Route
            path=""
            element={<RegularView/>}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
