import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import StorePage from "./pages/StorePage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "store/:storeId", element: <StorePage /> },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
    ],
  },
]);
