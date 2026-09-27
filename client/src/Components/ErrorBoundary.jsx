import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('CraftLoop UI Error caught by boundary:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#faf9ff] px-6 py-12">
          <div className="w-full max-w-md rounded-3xl border border-purple-100 bg-white p-8 text-center shadow-xl shadow-purple-100/50">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-2xl text-purple-600">
              ⚠️
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-900">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred while rendering this page.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 font-mono text-left overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700"
              >
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full rounded-xl border border-purple-200 px-5 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
