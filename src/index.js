#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import path from 'path'

// ES module-compatible __dirname
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Create the MCP server instance
const server = new McpServer({
    name: "Cypress Generator MCP",
    version: "1.0.19"
})

// Here starts code generated using Copilot:

// Utility functions for file operations
class CypressFileManager {
    constructor() {
        this.workspaceRoot = null
        this.cypressConfig = null
    }

    async detectWorkspace(startPath = process.cwd()) {
        let currentPath = startPath
        
        while (currentPath !== path.dirname(currentPath)) {
            const cypressConfigJs = path.join(currentPath, 'cypress.config.js')
            const cypressConfigTs = path.join(currentPath, 'cypress.config.ts')
            const packageJson = path.join(currentPath, 'package.json')
            
            if (await this.fileExists(cypressConfigJs) || await this.fileExists(cypressConfigTs)) {
                this.workspaceRoot = currentPath
                await this.loadCypressConfig(currentPath)
                return currentPath
            }
            
            // Also check if it's a Node.js project with Cypress in dependencies
            if (await this.fileExists(packageJson)) {
                try {
                    const packageContent = await fs.readFile(packageJson, 'utf8')
                    const packageData = JSON.parse(packageContent)
                    const hasCypress = packageData.dependencies?.cypress || 
                                     packageData.devDependencies?.cypress ||
                                     packageData.dependencies?.['@cypress/react'] ||
                                     packageData.devDependencies?.['@cypress/react']
                    
                    if (hasCypress) {
                        this.workspaceRoot = currentPath
                        return currentPath
                    }
                } catch (error) {
                    // Continue searching
                }
            }
            
            currentPath = path.dirname(currentPath)
        }
        
    throw new Error('No valid Cypress project found. Make sure you are in a directory with cypress.config.js/ts or a package.json with Cypress as a dependency.')
    }

    async loadCypressConfig(workspaceRoot) {
        const configJsPath = path.join(workspaceRoot, 'cypress.config.js')
        const configTsPath = path.join(workspaceRoot, 'cypress.config.ts')
        
        try {
            let configPath = null
            if (await this.fileExists(configJsPath)) {
                configPath = configJsPath
            } else if (await this.fileExists(configTsPath)) {
                configPath = configTsPath
            }
            
            if (configPath) {
                // For now, we'll use default paths. In a more sophisticated version,
                // we could dynamically import and parse the config
                this.cypressConfig = {
                    e2e: {
                        specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
                        supportFile: 'cypress/support/e2e.js'
                    },
                    component: {
                        specPattern: 'cypress/component/**/*.cy.{js,ts}'
                    }
                }
            }
        } catch (error) {
            console.warn('Could not load Cypress config, using defaults:', error.message)
            this.cypressConfig = {
                e2e: {
                    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
                    supportFile: 'cypress/support/e2e.js'
                }
            }
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath)
            return true
        } catch {
            return false
        }
    }

    async ensureDirectoryStructure(workspaceRoot) {
        const directories = [
            path.join(workspaceRoot, 'cypress'),
            path.join(workspaceRoot, 'cypress', 'pages'),
            path.join(workspaceRoot, 'cypress', 'e2e'),
            path.join(workspaceRoot, 'cypress', 'e2e', 'tests'),
            path.join(workspaceRoot, 'cypress', 'support'),
            path.join(workspaceRoot, 'cypress', 'fixtures')
        ]
        
        for (const dir of directories) {
            await fs.mkdir(dir, { recursive: true })
        }
    }

    async createPageObject(workspaceRoot, url, pageObjectMeta) {
        const { featureName, classCode } = pageObjectMeta
        const fileName = `${featureName}.js`
        const filePath = path.join(workspaceRoot, 'cypress', 'pages', fileName)
        
        if (await this.fileExists(filePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const backupPath = path.join(workspaceRoot, 'cypress', 'pages', `${featureName}.backup.${timestamp}.js`)
            await fs.copyFile(filePath, backupPath)
        }
        
        await fs.writeFile(filePath, classCode, 'utf8')
        return filePath
    }

    async createTestFile(workspaceRoot, url, testCode, featureName) {
        const fileName = `${featureName}.cy.js`
        const filePath = path.join(workspaceRoot, 'cypress', 'e2e', 'tests', fileName)
        
        if (await this.fileExists(filePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const backupPath = path.join(workspaceRoot, 'cypress', 'e2e', 'tests', `${featureName}.backup.${timestamp}.cy.js`)
            await fs.copyFile(filePath, backupPath)
        }
        
        await fs.writeFile(filePath, testCode, 'utf8')
        return filePath
    }

    sanitizeFileName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    }

    async createIndexFile(workspaceRoot) {
        const indexPath = path.join(workspaceRoot, 'cypress', 'pages', 'index.js')
        
        // Get all page object files
        const pagesDir = path.join(workspaceRoot, 'cypress', 'pages')
        const files = await fs.readdir(pagesDir)
        const pageFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js')
        
        const imports = pageFiles.map(file => {
            const className = file.replace('.js', '')
            return `export { ${className} } from './${file.replace('.js', '')}'`
        }).join('\n')
        
        const indexContent = `// Auto-generated index file for page objects
${imports}
`
        
        await fs.writeFile(indexPath, indexContent, 'utf8')
        return indexPath
    }
}

// Function to generate Cypress Page Object class with locators and action methods


// Utility to convert any string to camelCase
function toCamelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (m) => m.toLowerCase());
}

function generatePageObjectClass($, url, customFeatureName = null, instructions = null) {
    const featureName = customFeatureName || getFeatureName($, url)
    const className = featureName.charAt(0).toUpperCase() + featureName.slice(1) + 'Page'
    const elements = []
    const getters = []
    const valueGetters = []
    const interactionMethods = []
    let elementCounter = 1
    const elementMeta = []

    // BUTTONS
    $('button').each((_, element) => {
        const $el = $(element)
        const text = $el.text().trim()
        const id = $el.attr('id')
        const classNameAttr = $el.attr('class')
        const dataTestId = $el.attr('data-testid')
        let locator = ''
        let rawName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            rawName = `button ${dataTestId}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            rawName = `button ${id}`
        } else if (text) {
            locator = `cy.contains('button', '${text}')`
            rawName = `button ${text}`
        } else if (classNameAttr) {
            locator = `cy.get('button.${classNameAttr.split(' ')[0]}')`
            rawName = `button ${classNameAttr.split(' ')[0]}`
        } else {
            locator = `cy.get('button').eq(${elementCounter - 1})`
            rawName = `button ${elementCounter}`
        }
        const elementName = toCamelCase(rawName)
        elements.push(`    ${elementName}: () => ${locator}`)
        interactionMethods.push(`    click${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().click() }`)
        valueGetters.push(`    getText${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().invoke('text') }`)
        elementCounter++
    })
    // INPUTS
    $('input').each((_, element) => {
        const $el = $(element)
        const type = $el.attr('type') || 'text'
        const id = $el.attr('id')
        const name = $el.attr('name')
        const placeholder = $el.attr('placeholder')
        const dataTestId = $el.attr('data-testid')
        let locator = ''
        let rawName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            rawName = `input ${dataTestId}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            rawName = `input ${id}`
        } else if (name) {
            locator = `cy.get('input[name="${name}"]')`
            rawName = `input ${name}`
        } else if (placeholder) {
            locator = `cy.get('input[placeholder="${placeholder}"]')`
            rawName = `input ${placeholder}`
        } else {
            locator = `cy.get('input[type="${type}"]').eq(${elementCounter - 1})`
            rawName = `input ${type} ${elementCounter}`
        }
        const elementName = toCamelCase(rawName)
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName}() { return this.#elements.${elementName}() }`)
        if (type === 'checkbox' || type === 'radio') {
            interactionMethods.push(`    check${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().check() }`)
            interactionMethods.push(`    uncheck${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().uncheck() }`)
            valueGetters.push(`    isChecked${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().should('have.prop', 'checked') }`)
        } else {
            interactionMethods.push(`    type${elementName.charAt(0).toUpperCase() + elementName.slice(1)}(text) { return this.#elements.${elementName}().type(text) }`)
            interactionMethods.push(`    clear${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().clear() }`)
            valueGetters.push(`    getValue${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().invoke('val') }`)
        }
        elementMeta.push({ type, elementName })
        elementCounter++
    })
    // LINKS
    $('a').each((_, element) => {
        const $el = $(element)
        const text = $el.text().trim()
        const href = $el.attr('href')
        const id = $el.attr('id')
        const dataTestId = $el.attr('data-testid')
        let locator = ''
        let rawName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            rawName = `link ${dataTestId}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            rawName = `link ${id}`
        } else if (text) {
            locator = `cy.contains('a', '${text}')`
            rawName = `link ${text}`
        } else if (href) {
            locator = `cy.get('a[href="${href}"]')`
            rawName = `link ${href}`
        } else {
            locator = `cy.get('a').eq(${elementCounter - 1})`
            rawName = `link ${elementCounter}`
        }
        const elementName = toCamelCase(rawName)
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName}() { return this.#elements.${elementName}() }`)
        interactionMethods.push(`    click${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().click() }`)
        valueGetters.push(`    getText${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().invoke('text') }`)
        elementMeta.push({ type: 'link', elementName })
        elementCounter++
    })
    // SELECTS
    $('select').each((_, element) => {
        const $el = $(element)
        const id = $el.attr('id')
        const name = $el.attr('name')
        const dataTestId = $el.attr('data-testid')
        let locator = ''
        let rawName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            rawName = `select ${dataTestId}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            rawName = `select ${id}`
        } else if (name) {
            locator = `cy.get('select[name="${name}"]')`
            rawName = `select ${name}`
        } else {
            locator = `cy.get('select').eq(${elementCounter - 1})`
            rawName = `select ${elementCounter}`
        }
        const elementName = toCamelCase(rawName)
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName}() { return this.#elements.${elementName}() }`)
        interactionMethods.push(`    select${elementName.charAt(0).toUpperCase() + elementName.slice(1)}(value) { return this.#elements.${elementName}().select(value) }`)
        valueGetters.push(`    getValue${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().invoke('val') }`)
        elementMeta.push({ type: 'select', elementName })
        elementCounter++
    })
    // TEXTAREAS
    $('textarea').each((_, element) => {
        const $el = $(element)
        const id = $el.attr('id')
        const name = $el.attr('name')
        const placeholder = $el.attr('placeholder')
        const dataTestId = $el.attr('data-testid')
        let locator = ''
        let rawName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            rawName = `textarea ${dataTestId}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            rawName = `textarea ${id}`
        } else if (name) {
            locator = `cy.get('textarea[name="${name}"]')`
            rawName = `textarea ${name}`
        } else if (placeholder) {
            locator = `cy.get('textarea[placeholder="${placeholder}"]')`
            rawName = `textarea ${placeholder}`
        } else {
            locator = `cy.get('textarea').eq(${elementCounter - 1})`
            rawName = `textarea ${elementCounter}`
        }
        const elementName = toCamelCase(rawName)
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName}() { return this.#elements.${elementName}() }`)
        interactionMethods.push(`    type${elementName.charAt(0).toUpperCase() + elementName.slice(1)}(text) { return this.#elements.${elementName}().type(text) }`)
        interactionMethods.push(`    clear${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().clear() }`)
        valueGetters.push(`    getValue${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().invoke('val') }`)
        elementMeta.push({ type: 'textarea', elementName })
        elementCounter++
    })
    const metaMap = elementMeta.reduce((acc, m) => { acc[m.elementName] = m.type; return acc }, {})
    return {
        classCode: `export class ${className} {\n  // Private elements\n  #elements = {\n${elements.join(',\n')}\n  }\n\n  // Element meta (currently not used for bulk actions)\n  #meta = ${JSON.stringify(metaMap, null, 2)}\n\n  // Public getters\n${getters.join('\n')}\n\n  // Value/State getters\n${valueGetters.join('\n')}\n\n  // Interaction methods (per-element actions)\n${interactionMethods.join('\n')}\n}\n`,
        className,
        featureName,
        elementMeta
    }
}

// Helper function to generate class name from URL
function generateClassName(url) {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '')
    const pathname = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '')
    
    let className = hostname.charAt(0).toUpperCase() + hostname.slice(1)
    if (pathname && pathname !== '/') {
        className += pathname.charAt(0).toUpperCase() + pathname.slice(1)
    }
    
    return `${className}Page`
}

// Utility: Infer a feature/page name from HTML or URL
function getFeatureName($, url) {
    // Try form name/id
    let name = $('form').attr('name') || $('form').attr('id')
    if (name) return sanitizeFeatureName(name)

    // Try legend inside form
    let legend = $('form legend').first().text().trim()
    if (legend) return sanitizeFeatureName(legend)

    // Try h1/h2
    let h1 = $('h1').first().text().trim()
    if (h1) return sanitizeFeatureName(h1)
    let h2 = $('h2').first().text().trim()
    if (h2) return sanitizeFeatureName(h2)

    // Try page title
    let title = $('title').first().text().trim()
    if (title) return sanitizeFeatureName(title)

    // Try common keywords in URL or path
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    const keywords = ['login', 'register', 'signup', 'signin', 'user', 'profile', 'dashboard', 'settings', 'admin', 'account', 'reset', 'forgot', 'password', 'contact', 'about', 'home']
    for (const part of pathParts) {
        for (const keyword of keywords) {
            if (part.toLowerCase().includes(keyword)) {
                return keyword
            }
        }
    }
    for (const keyword of keywords) {
        if (urlObj.hostname.toLowerCase().includes(keyword)) {
            return keyword
        }
    }

    // Fallback: use hostname + first path part
    if (pathParts.length > 0) {
        return sanitizeFeatureName(pathParts[0])
    }
    return 'page'
}

function sanitizeFeatureName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}


// Copilot generated code ends here

// Tools (updated to registerTool API replacing deprecated server.tool style)
server.registerTool(
    'create_Page_Object_file',
    {
        title: 'Create Page Object File',
        description: 'Create Page Object file directly in the Cypress project by analyzing the provided URL',
        inputSchema: {
            url: z.string().describe('URL of the web page'),
            workspacePath: z.string().optional().describe('Workspace path (optional, it is detected automatically if not provided)'),
            pageObjectName: z.string().optional().describe('Custom name for the page object (optional)'),
            instructions: z.string().optional().describe('Additional instructions for generating the page object')
        }
    },
    async ({ url, workspacePath, pageObjectName, instructions }) => {
        const fileManager = new CypressFileManager()
        try {
            const workspaceRoot = await fileManager.detectWorkspace(workspacePath)
            await fileManager.ensureDirectoryStructure(workspaceRoot)
            // Read local instructions file
            let localInstructions = ''
            const localInstructionsPath = path.join(__dirname || process.cwd(), '.github', 'instructions', 'cypress.instructions.md')
            if (await fileManager.fileExists(localInstructionsPath)) {
                localInstructions = await fs.readFile(localInstructionsPath, 'utf8')
            }
            // If instructions param is a file path, read it
            let externalInstructions = ''
            if (instructions && instructions.trim().length > 0) {
                // If instructions looks like a file path, read it
                if (instructions.endsWith('.md') || instructions.endsWith('.txt')) {
                    if (await fileManager.fileExists(instructions)) {
                        externalInstructions = await fs.readFile(instructions, 'utf8')
                    } else {
                        externalInstructions = instructions // fallback: treat as raw string
                    }
                } else {
                    externalInstructions = instructions
                }
            }
            // Override local instructions if external instructions are provided
            let finalInstructions = localInstructions
            if (externalInstructions) {
                finalInstructions = externalInstructions
            }
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
            const page = await browser.newPage()
            await page.goto(url, { waitUntil: 'networkidle2' })
            const html = await page.content()
            await browser.close()
            const $ = cheerio.load(html)
            const pageObjectMeta = generatePageObjectClass($, url, pageObjectName, finalInstructions)
            const pageObjectPath = await fileManager.createPageObject(workspaceRoot, url, pageObjectMeta)
            const indexPath = await fileManager.createIndexFile(workspaceRoot)
            return {
                content: [
                    { type: 'text', text: `✅ Files created successfully:\n\n📄 Page Object: ${pageObjectPath}\n📋 Index File: ${indexPath}\n\nWorkspace detected: ${workspaceRoot}\n\nNow you can import the page object in your tests using:\nimport { ${pageObjectMeta.className} } from '../pages/${pageObjectMeta.featureName}'` }
                ]
            }
        } catch (error) {
            return { content: [ { type: 'text', text: `❌ Error creating Cypress files: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure you are in a directory with a valid Cypress project.` } ] }
        }
    }
)

// Create transport with proper error handling
let transport
try {
    transport = new StdioServerTransport()
} catch (error) {
    console.error('Failed to create StdioServerTransport:', error)
    // Fallback transport
    transport = {
        onclose: undefined,
        onerror: undefined,
        onmessage: undefined,
        start: async () => {},
        close: async () => {},
        send: async (message) => {}
    }
}

// Wrap in async function to avoid top-level await
(async () => {
    await server.connect(transport)
})()

