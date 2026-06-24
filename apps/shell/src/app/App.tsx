import { Outlet } from 'react-router-dom';

export const App = () => {
  return (
    <div className="h-screen bg-gray-950 text-gray-200 font-sans overflow-hidden">
      <Outlet />
    </div>
  );
};
