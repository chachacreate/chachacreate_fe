import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const App = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", padding: "16px" }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
export default App;
