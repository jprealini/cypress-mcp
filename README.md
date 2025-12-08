# MCP Cypress Page Object Generator

This MCP (Model Context Protocol) server automatically generates complete Cypress Page Object classes for any web page provided.

<a href="https://glama.ai/mcp/servers/@jprealini/cypress-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@jprealini/cypress-mcp/badge" alt="Cypress Page Object Generator MCP server" />
</a>

## Features

- **Web Scraping**: Uses Puppeteer to fetch and render web pages
- **HTML Parsing**: Uses Cheerio to parse HTML and extract element information
- **Page Object Generation**: Creates complete TypeScript Page Object classes with:
  - Private element locators
  - Public getter methods
  - Interaction methods (click, type, select, etc.)

## Generated Output

The server generates:

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

}
```

## Element Types Supported

- **Buttons**: Click interactions with validation
- **Input Fields**: Type, clear, check/uncheck (for checkboxes/radio)
- **Links**: Click interactions with navigation verification
- **Select Dropdowns**: Select options with validation
- **Textareas**: Type and clear with content verification
- **Forms**: Submit interactions with success/error handling

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
   The server exposes a `create_Page_Object_file` tool that accepts a URL parameter.

   Example tool call:
   ```json
   {
     "method": "tools/call",
     "params": {
       "name": "create_Page_Object_file",
       "arguments": {
         "url": "https://example.com/login"
       }
     }
   }
   ```

3. **Response format:**
   The server returns both the Page Object class:
   ```
   // ===== PAGE OBJECT CLASS =====
   // Save this as: ExampleComLoginPage.ts
   export class ExampleComLoginPage { ... } 

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

To add support for new element types, interaction methods, or test patterns, modify the `generatePageObjectClass` function in `index.js`.