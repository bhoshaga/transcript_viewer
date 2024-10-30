import React from 'react';
import { useUser } from '../contexts/UserContext';

const Login = () => {
  const { login } = useUser();

  const handleLogin = async (username) => {
    await login(username);
  };

  return (
    <div className="transcript-login">
      <h1>Meeting Transcript Viewer</h1>
      <div className="login-container">
        <h2>Select User</h2>
        <div className="user-buttons">
          <button onClick={() => handleLogin('bhoshaga')}>Login as Bhoshaga</button>
          <button onClick={() => handleLogin('garrett')}>Login as Garrett</button>
        </div>
      </div>
    </div>
  );
};

export default Login;