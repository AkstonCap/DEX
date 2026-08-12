# CONTRIBUTING.md

## Development Setup
1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/DEX.git
   cd DEX
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:8080`.

## Coding Standards
- Code is formatted with **Prettier** (`.prettierrc`).
- Linting is enforced via **ESLint** (`.eslintrc.json`). Run `npm run lint` to check.
- Write clear, descriptive variable and function names.
- Prefer `const` and `let`; avoid `var`.
- Use functional components with hooks; avoid class components.

## Pull Request Process
1. Create a new branch from `master` for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes, commit with a clear message:
   ```bash
   git commit -m "Add ..."   # or "Fix ..."
   ```
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request against the `master` branch of the upstream repository.
   - Include a description of what the PR does.
   - Reference any related issue numbers.
   - Ensure all tests pass (`npm test`).
   - Ensure linting passes (`npm run lint`).

## Testing
- Unit tests are written with **Jest** and **React Testing Library**.
- Run the test suite:
  ```bash
  npm test
  ```
- When adding new functionality, add corresponding test files under `test/` or `__tests__/`.
- Aim for high coverage on critical components (`TradeForm.js`, `OrderBookComp.js`, API utilities).

## Reporting Issues
- Use the GitHub Issues tab.
- Provide steps to reproduce, expected vs. actual behavior, and relevant screenshots or console logs.