export const loginUser = async (username: string) => {
  try {
    const response = await fetch("https://api.stru.ai/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} - ${errorText || 'Unknown error'}`);
    }
    
    localStorage.setItem("username", username);
    return response.json();
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logoutUser = async (username: string) => {
  try {
    const response = await fetch("https://api.stru.ai/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Username": username,
      },
      body: JSON.stringify({ username }),
      credentials: "include",
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Logout failed: ${response.status} - ${errorText || 'Unknown error'}`);
    }
    
    localStorage.removeItem("username");
    return response.json();
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};
