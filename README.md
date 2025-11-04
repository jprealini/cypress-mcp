# MCP Cypress Page Object & Test Generator

This MCP (Model Context Protocol) server automatically generates complete Cypress Page Object classes **AND** comprehensive test suites for any web page.

<a href="https://glama.ai/mcp/servers/@jprealini/cypress-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@jprealini/cypress-mcp/badge" alt="Cypress Page Object & Test Generator MCP server" />
</a>

## Features

- **Web Scraping**: Uses Puppeteer to fetch and render web pages
- **HTML Parsing**: Uses Cheerio to parse HTML and extract element information
- **Page Object Generation**: Creates complete TypeScript Page Object classes with:
  - Private element locators
  - Public getter methods
  - Interaction methods (click, type, select, etc.)
  - Workflow methods for common test scenarios
- **Test Suite Generation**: Creates comprehensive Cypress test files with:
  - Positive test cases for all elements
  - Negative test cases for error handling
  - Workflow tests for common scenarios
  - Accessibility, performance, and edge case tests

## Generated Output

The server generates **two files**:

### 1. Page Object Class (`{ClassName}.ts`)
```typescript
export class ExampleComLoginPage {
  // Private elements
  #elements = {
    button_login: () => cy.get('#login-button'),
    input_username: () => cy.get('input[name="username"]'),
    link_home: () => cy.contains('a', 'Home')
  }

  // Public getters
  get ButtonLogin() { return this.#elements.button_login() }
  get InputUsername() { return this.#elements.input_username() }
  get LinkHome() { return this.#elements.link_home() }

  // Interaction methods
  clickButtonLogin() { return this.#elements.button_login().click() }
  typeInputUsername(text: string) { return this.#elements.input_username().type(text) }
  clickLinkHome() { return this.#elements.link_home().click() }

  // Workflow methods
  login(username: string, password: string) {
    this.typeInputUsername(username)
    this.typeInputPassword(password)
    this.clickButtonLogin()
    return this
  }
}
```

### 2. Test Suite (`{ClassName}.cy.ts`)
```typescript
import { ExampleComLoginPage } from './ExampleComLoginPage'

describe('ExampleComLoginPage Tests', () => {
  let page: ExampleComLoginPage
  
  beforeEach(() => {
    cy.visit('https://example.com/login')
    page = new ExampleComLoginPage()
  })
  
  describe('Element Interactions', () => {
    it('should click button_login', () => {
      page.clickButtonLogin()
    })
    
    it('should type in input_username', () => {
      page.typeInputUsername('test input')
      page.getInputUsername().should('have.value', 'test input')
    })
  })
  
  describe('Login Workflow', () => {
    it('should login with valid credentials', () => {
      page.login('validuser@example.com', 'validpassword')
      cy.url().should('not.include', '/login')
    })
    
    it('should show error with invalid credentials', () => {
      page.login('invalid@example.com', 'wrongpassword')
      cy.contains('Invalid credentials').should('be.visible')
    })
  })
  
  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.intercept('GET', '**', { forceNetworkError: true })
      cy.visit('https://example.com/login')
    })
  })
})
```

## Test Categories Generated

### ✅ **Positive Test Cases**
- **Element Interactions**: Click, type, clear, check/uncheck for all detected elements
- **Workflow Tests**: Login, search, navigation workflows
- **Form Validation**: Successful form submissions
- **Element Visibility**: All elements are visible and accessible

### ❌ **Negative Test Cases**
- **Error Handling**: Network errors, server errors, slow connections
- **Validation Errors**: Empty fields, invalid formats, required field validation
- **Edge Cases**: Large inputs, special characters, unicode text
- **Accessibility**: ARIA labels, keyboard navigation

### 🔧 **Additional Test Types**
- **Performance Tests**: Load times, rapid interactions
- **Responsive Tests**: Different viewport sizes
- **Accessibility Tests**: ARIA compliance, keyboard navigation
- **Security Tests**: Input sanitization, XSS prevention

## Element Types Supported

- **Buttons**: Click interactions with validation
- **Input Fields**: Type, clear, check/uncheck (for checkboxes/radio)
- **Links**: Click interactions with navigation verification
- **Select Dropdowns**: Select options with validation
- **Textareas**: Type and clear with content verification
- **Forms**: Submit interactions with success/error handling

## Workflow Detection

The server intelligently detects common patterns and generates appropriate tests:

- **Login Forms**: Username/password validation, error handling
- **Search Forms**: Query validation, results verification
- **Navigation**: Home links, breadcrumbs, menu items
- **Form Submissions**: Success states, validation errors

## Installation

```bash
npm install
```

## Usage

1. **Start the server:**
   ```bash
   npx tsx main.ts
   ```

2. **Use with an MCP client:**
   The server exposes a `generateLocator` tool that accepts a URL parameter.

   Example tool call:
   ```json
   {
     "method": "tools/call",
     "params": {
       "name": "generateLocator",
       "arguments": {
         "url": "https://example.com/login"
       }
     }
   }
   ```

3. **Response format:**
   The server returns both the Page Object class and test suite:
   ```
   // ===== PAGE OBJECT CLASS =====
   // Save this as: ExampleComLoginPage.ts
   export class ExampleComLoginPage { ... }
   
   // ===== CYPRESS TESTS =====
   // Save this as: ExampleComLoginPage.cy.ts
   describe('ExampleComLoginPage Tests', () => { ... }
   ```

## Example Usage in Tests

```typescript
// Use the generated Page Object
import { ExampleComLoginPage } from './ExampleComLoginPage'

describe('Login Page', () => {
  const page = new ExampleComLoginPage()
  
  it('should login successfully', () => {
    page.login('username', 'password')
    page.verifyPageLoaded()
  })
})

// Run the generated test suite
// npx cypress run --spec "cypress/e2e/ExampleComLoginPage.cy.ts"
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `puppeteer`: Web scraping and page rendering
- `cheerio`: HTML parsing and element selection
- `zod`: Schema validation
- `typescript`: Type safety

## Error Handling

The server includes comprehensive error handling for:
- Invalid URLs
- Network connectivity issues
- Page loading failures
- HTML parsing errors

## Browser Configuration

The server uses Puppeteer with the following settings:
- Headless mode for server environments
- No-sandbox mode for containerized deployments
- Network idle waiting for dynamic content

## Contributing

To add support for new element types, interaction methods, or test patterns, modify the `generatePageObjectClass` and `generateCypressTests` functions in `main.ts`.