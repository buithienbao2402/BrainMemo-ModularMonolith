import * as React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { createAppRouter } from './app/router';

export function App() {
  const [router] = React.useState(() => createAppRouter());

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

export default App;

