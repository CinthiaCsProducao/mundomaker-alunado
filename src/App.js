import { BrowserRouter, Routes, Route } from "react-router-dom";
import AlunadoForm from "./AlunadoForm";
import Dashboard from "./Dashboard";
import Privacidade from "./Privacidade";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AlunadoForm />} />
        <Route path="/formulario" element={<AlunadoForm />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;