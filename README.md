# Previewly

A web application for building applications by using Ai || similar to bolt.

## Project Structure

- `client/` - Frontend application
- `server/` - Backend server

## Getting Started

### Prerequisites

- Node.js
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. Start the development servers:
   ```bash
   # Start the backend server
   cd server
   npm run dev

   # In a new terminal, start the frontend
   cd client
   npm run dev
   ```

### API Configuration

- The frontend defaults to calling `/api`, and Vite proxies that to `http://127.0.0.1:3000` during local development.
- If your backend needs a different port, start it with `PORT=<your-port> npm run dev` in `server/`.
- Then create `client/.env.local` from `client/.env.example` and update `VITE_API_PROXY_TARGET` to match that backend URL.
- For deployments where the API is on a different origin, set `VITE_API_URL` to the full API base URL.

## License

MIT 
