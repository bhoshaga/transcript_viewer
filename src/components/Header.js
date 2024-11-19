import React from 'react';
import { LogOut } from 'lucide-react';

const Header = ({ username, onLogout, connected }) => {
  return (
    <header className="bg-gray-800/50 border-b border-gray-700 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-100">
          Transcript Viewer
        </h1>
        <div className="flex items-center gap-4">
          {connected && (
            <span className="flex items-center text-green-400 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Connected
            </span>
          )}
          <span className="text-gray-400">{username}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                     text-gray-400 hover:text-gray-100 hover:bg-gray-700/50
                     transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;