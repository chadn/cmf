// Mock for axios-curlirize (ESM-only package used only in development)
// This allows tests to run without importing the actual package
export default function curlirize() {
    // No-op for tests
    return
}
