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

## Instructions File (Customization)

This MCP uses a local instructions file located at `.github/instructions/cypress.instructions.md` to define the standards and patterns for generating Cypress Page Object files. These instructions cover code quality, file structure, and best practices for Page Object Model implementation.

### Overriding Local Instructions

You can override the local instructions by passing an external instructions file (such as a Markdown or text file) using the `instructions` parameter when calling the MCP's `create_Page_Object_file` tool. If external instructions are provided, they will be used instead of the local instructions file.

#### Example Tool Call with External Instructions
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_Page_Object_file",
    "arguments": {
      "url": "https://example.com/login",
      "instructions": "/path/to/your/custom.instructions.md"
    }
  }
}
```

- If the `instructions` parameter is a file path, the MCP will read and use that file's contents.
- If the parameter is a string, it will use the string as instructions directly.
- If no external instructions are provided, the MCP will use its local instructions file by default.

See `.github/instructions/cypress.instructions.md` for the default instruction format and customization options.

## Troubleshooting: Updating to the Latest MCP Version

If you publish a new version of this MCP and consumers do not see the update immediately, follow these steps:

1. **Always increment the version in `package.json` before publishing.**
2. **Clear the NPM cache and reinstall the package:**
   ```sh
   npm cache clean --force
   npm install @jprealini/cypress-mcp@latest
   ```
3. **If using a lockfile (`package-lock.json` or `yarn.lock`), delete it and run:**
   ```sh
   npm install
   ```
4. **For global installs, update globally:**
   ```sh
   npm install -g @jprealini/cypress-mcp@latest
   ```
5. **Verify the installed version:**
   ```sh
   npm list @jprealini/cypress-mcp
   ```

These steps ensure consumers always get the latest published MCP version and avoid issues with cached or locked old versions.