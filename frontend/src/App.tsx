import { useState, useEffect } from "react";

interface HealthStatus {
  status: string;
  timestamp: string;
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthStatus) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Teller Quoting System</h1>

        <div className="bg-gray-800 rounded-lg p-6 max-w-md">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>

          {loading && (
            <p className="text-gray-400">Checking system health...</p>
          )}

          {error && (
            <div className="text-red-400">
              <p>Error: {error}</p>
            </div>
          )}

          {health && (
            <div className="text-green-400">
              <p className="text-xl mb-2">Status: {health.status}</p>
              <p className="text-sm text-gray-400">
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-gray-400 text-sm">
          Frontend: React + TypeScript + Vite + Tailwind CSS
          <br />
          Backend: FastAPI + Python 3.13
        </p>
      </div>
    </div>
  );
}

export default App;
