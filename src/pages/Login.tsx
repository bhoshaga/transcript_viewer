import { useNavigate } from "react-router-dom";
import { loginUser } from "../apis/auth";
import React, { useState } from "react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Use the API to login instead of directly setting localStorage
      await loginUser(username);
      // Use navigate instead of directly manipulating window.location
      navigate("/transcript", { replace: true });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background text-foreground px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Note Taker"
          src="/logo.svg"
          className="mx-auto h-12 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-foreground">
          Sign in to Note Taker
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-foreground"
            >
              Username
            </label>
            <div className="mt-2">
              <input
                onChange={handleChange}
                value={username}
                id="username"
                name="username"
                type="text"
                required
                className="block w-full rounded-md border-0 py-1.5 px-4 bg-background text-foreground shadow-sm ring-1 ring-inset ring-input placeholder:text-muted-foreground focus:outline-none focus:ring-0 sm:text-sm"
                placeholder="Enter any username"
                style={{ paddingLeft: '16px' }}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
