import { createContext, useContext, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AppContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
