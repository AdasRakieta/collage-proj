import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1c1c1e] transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-[#38383a] sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#38383a] rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-[#ffffff]" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#ffffff]">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Appearance Section */}
          <section className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-[#38383a] overflow-hidden transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-[#38383a]">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#ffffff]">Appearance</h2>
              <p className="text-sm text-gray-600 dark:text-[#98989d] mt-1">
                Customize how Journey Planner looks on your device
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-[#ffffff] mb-3">
                  Theme
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Light Theme Option */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all duration-200
                      ${theme === 'light'
                        ? 'border-blue-500 dark:border-[#0a84ff] bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-[#38383a] hover:border-gray-300 dark:hover:border-[#48484a]'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                        <Sun className="w-6 h-6 text-amber-500" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-[#ffffff]">Light</div>
                        <div className="text-xs text-gray-600 dark:text-[#98989d] mt-1">
                          Bright and clear
                        </div>
                      </div>
                      {theme === 'light' && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 dark:bg-[#0a84ff] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Dark Theme Option */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all duration-200
                      ${theme === 'dark'
                        ? 'border-blue-500 dark:border-[#0a84ff] bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-[#38383a] hover:border-gray-300 dark:hover:border-[#48484a]'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                        <Moon className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-[#ffffff]">Dark</div>
                        <div className="text-xs text-gray-600 dark:text-[#98989d] mt-1">
                          Easy on the eyes
                        </div>
                      </div>
                      {theme === 'dark' && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 dark:bg-[#0a84ff] rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* System Theme Option (Future Enhancement) */}
                  <button
                    disabled
                    className="relative p-4 rounded-lg border-2 border-gray-200 dark:border-[#38383a] opacity-50 cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white to-gray-800 border-2 border-gray-300 flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-[#ffffff]">System</div>
                        <div className="text-xs text-gray-600 dark:text-[#98989d] mt-1">
                          Coming soon
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>Current theme:</strong> {theme === 'light' ? 'Light' : 'Dark'}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Your preference is saved automatically and will persist across sessions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-[#38383a] overflow-hidden transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-[#38383a]">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#ffffff]">About</h2>
            </div>
            
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600 dark:text-[#98989d]">Version</span>
                <span className="text-sm font-medium text-gray-900 dark:text-[#ffffff]">1.0.0 MVP</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-[#38383a]">
                <span className="text-sm text-gray-600 dark:text-[#98989d]">Environment</span>
                <span className="text-sm font-medium text-gray-900 dark:text-[#ffffff]">Development</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-[#38383a]">
                <span className="text-sm text-gray-600 dark:text-[#98989d]">Made with</span>
                <span className="text-sm font-medium text-gray-900 dark:text-[#ffffff]">React + TypeScript</span>
              </div>
            </div>
          </section>

          {/* Back Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-500 dark:bg-[#0a84ff] text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors font-medium"
            >
              Back to Journey Planner
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
