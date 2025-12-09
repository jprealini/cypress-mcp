---
description: 'Cypress Page Object generation instructions'
applyTo: '**'
---

# Cypress Page Object Generation Instructions

## Code quality standards
- **Locators**: Use data attributes (e.g., `data-cy`, `data-test`, `data-testid`, etc) for selecting elements in tests to ensure stability and maintainability if present. If not, use unique CSS selectors or IDs.
- **Page Object structure**: Implement the Page Object Model (POM) for better organization and reusability of page-related actions and selectors.
- **Private elements**: Use private methods or properties to encapsulate element locators within the page object.
- **Action methods**: Create public methods for common actions (e.g., `clickLoginButton()`, `enterUsername()`) to encapsulate interactions with page elements.
- **Get methods**: Create getter methods for page elements that might require having their values read from the tests (e.g. `getUsernameField()`, `getTooltipMessage()`).
- **Naming conventions**: Follow consistent naming conventions for methods and properties (camelCase for methods and properties).
- **Chaining**: Chain commands within action methods to keep the code concise and readable.
- **Error Handling**: Implement error handling within action methods to manage potential issues during interactions.
- **Comments**: Use comments to explain complex logic or important steps in the page object.

## File structure
- **Page Objects**: Place page object files in the `cypress/pages/` directory, with each file representing a specific page or component.
