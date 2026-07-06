import { BrowserRouter, Routes, Route } from "react-router-dom";
import AlunadoForm from "./AlunadoForm";
import Dashboard from "./Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AlunadoForm />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;