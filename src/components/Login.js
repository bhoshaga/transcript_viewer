import React, { useState } from 'react';
import { AlertCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

const Login = ({ onLogin }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('https://api.stru.ai/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({ username })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      onLogin(username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="relative w-full max-w-sm">
        {/* Decorative Elements */}
        <div
          className="absolute inset-0 -z-10 transform-gpu blur-3xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-25"
            style={{
              clipPath:
                'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
            }}
          />
        </div>

        <div className="relative">
          <div className="p-8 backdrop-blur-xl bg-white/5 border border-gray-800 rounded-2xl shadow-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-100 mb-2">
                Transcript Viewer
              </h1>
              <p className="text-gray-400">
                Enter your username to continue
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4 border-red-500/20 bg-red-500/5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label 
                  htmlFor="username" 
                  className="block text-sm font-medium text-gray-300"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 
                           rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                           focus:border-blue-500/50 text-gray-100 placeholder-gray-500
                           transition-colors duration-200"
                  disabled={loading}
                  maxLength={50}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 
                         bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                         rounded-lg text-white font-medium
                         transition-colors duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account? Just enter any username to get started.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;