import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Home } from './pages/Home'
import { Messaging } from './pages/Messaging'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900">
        {/* Navigation */}
        <motion.nav 
          className="bg-black/20 backdrop-blur-lg border-b border-white/10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link to="/">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-2xl font-bold text-white"
                >
                  SOLV
                </motion.div>
              </Link>
              <Link to="/messaging">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    Messaging
                  </Button>
                </motion.div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => {
                  // Language toggle functionality will be added here
                }}
              >
                EN/TR
              </Button>
            </div>
          </div>
        </motion.nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/messaging" element={<Messaging />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
