import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CreateNewMusicPage from "./pages/create-new-musicbox-page.jsx";
import MusicboxPage from "./pages/musicbox-page.jsx";
import "./index.css"

function App() {
  return (
    <Router>
      <Routes>
          <Route path="/" element={<CreateNewMusicPage />} />
          <Route path="/musicbox" element={<MusicboxPage />} />
      </Routes>
    </Router>
  );
}

export default App;