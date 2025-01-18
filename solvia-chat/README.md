# Solvia Chat

A decentralized messaging and video calling platform built on the Solana blockchain.

## Features
- Secure peer-to-peer messaging with message status tracking
- Video and audio calling using WebRTC
- Solana wallet integration for secure authentication
- Modern UI built with React, TypeScript, and shadcn/ui

## Prerequisites
- Node.js v16+
- Solana wallet (e.g., Phantom)
- Modern web browser with WebRTC support

## Installation
1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure
```
src/
├── components/     # React components
│   ├── ui/        # Reusable UI components
│   └── ...        # Feature-specific components
├── lib/           # Utility functions and hooks
└── App.tsx        # Main application component
```

## Related Projects
This is part of the [Solvia](../) ecosystem, which includes tools for Solana token metadata management.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
