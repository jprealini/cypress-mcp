#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import path from 'path'

// Create the MCP server instance
const server = new McpServer({
    name: "Cypress Generator MCP",
    version: "1.0.0"
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

function generatePageObjectClass($, url, customFeatureName = null) {
    const featureName = customFeatureName || getFeatureName($, url)
    const className = featureName.charAt(0).toUpperCase() + featureName.slice(1) + 'Page'
    const elements = []
    const getters = []
    const valueGetters = []
    const interactionMethods = []
    const workflowMethods = []
    // Removed bulk generic methods per user request; we keep individual element action methods only.
    let elementCounter = 1
    // Track generated element names for test consistency and generic grouping
    const elementMeta = []

    // BUTTONS
    $('button').each((_, element) => {
        const $el = $(element)
        const text = $el.text().trim()
        const id = $el.attr('id')
        const classNameAttr = $el.attr('class')
        const dataTestId = $el.attr('data-testid')
        let locator = ''
        let elementName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            elementName = `button_${dataTestId.replace(/[^a-zA-Z0-9]/g, '_')}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            elementName = `button_${id}`
        } else if (text) {
            locator = `cy.contains('button', '${text}')`
            elementName = `button_${text.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
        } else if (classNameAttr) {
            locator = `cy.get('button.${classNameAttr.split(' ')[0]}')`
            elementName = `button_${classNameAttr.split(' ')[0]}`
        } else {
            locator = `cy.get('button').eq(${elementCounter - 1})`
            elementName = `button_${elementCounter}`
        }
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}() }`)
        interactionMethods.push(`    click${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().click() }`)
        valueGetters.push(`    getText${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().invoke('text') }`)
        elementMeta.push({ type: 'button', elementName })
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
        let elementName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            elementName = `input_${dataTestId.replace(/[^a-zA-Z0-9]/g, '_')}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            elementName = `input_${id}`
        } else if (name) {
            locator = `cy.get('input[name="${name}"]')`
            elementName = `input_${name}`
        } else if (placeholder) {
            locator = `cy.get('input[placeholder="${placeholder}"]')`
            elementName = `input_${placeholder.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
        } else {
            locator = `cy.get('input[type="${type}"]').eq(${elementCounter - 1})`
            elementName = `input_${type}_${elementCounter}`
        }
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}() }`)
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
        let elementName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            elementName = `link_${dataTestId.replace(/[^a-zA-Z0-9]/g, '_')}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            elementName = `link_${id}`
        } else if (text) {
            locator = `cy.contains('a', '${text}')`
            elementName = `link_${text.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
        } else if (href) {
            locator = `cy.get('a[href="${href}"]')`
            elementName = `link_${href.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
        } else {
            locator = `cy.get('a').eq(${elementCounter - 1})`
            elementName = `link_${elementCounter}`
        }
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}() }`)
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
        let elementName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            elementName = `select_${dataTestId.replace(/[^a-zA-Z0-9]/g, '_')}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            elementName = `select_${id}`
        } else if (name) {
            locator = `cy.get('select[name="${name}"]')`
            elementName = `select_${name}`
        } else {
            locator = `cy.get('select').eq(${elementCounter - 1})`
            elementName = `select_${elementCounter}`
        }
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}() }`)
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
        let elementName = ''
        if (dataTestId) {
            locator = `cy.get('[data-testid="${dataTestId}"]')`
            elementName = `textarea_${dataTestId.replace(/[^a-zA-Z0-9]/g, '_')}`
        } else if (id) {
            locator = `cy.get('#${id}')`
            elementName = `textarea_${id}`
        } else if (name) {
            locator = `cy.get('textarea[name="${name}"]')`
            elementName = `textarea_${name}`
        } else if (placeholder) {
            locator = `cy.get('textarea[placeholder="${placeholder}"]')`
            elementName = `textarea_${placeholder.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
        } else {
            locator = `cy.get('textarea').eq(${elementCounter - 1})`
            elementName = `textarea_${elementCounter}`
        }
        elements.push(`    ${elementName}: () => ${locator}`)
        getters.push(`    get ${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}() }`)
        interactionMethods.push(`    type${elementName.charAt(0).toUpperCase() + elementName.slice(1)}(text) { return this.#elements.${elementName}().type(text) }`)
        interactionMethods.push(`    clear${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().clear() }`)
        valueGetters.push(`    getValue${elementName.charAt(0).toUpperCase() + elementName.slice(1)}() { return this.#elements.${elementName}().invoke('val') }`)
        elementMeta.push({ type: 'textarea', elementName })
        elementCounter++
    })
    // (Meta map previously used for bulk methods retained only if needed in future; not required now.)
    const metaMap = elementMeta.reduce((acc, m) => { acc[m.elementName] = m.type; return acc }, {})
    // Generate workflow methods based on detected elements
    const hasLoginForm = $('form').length > 0 && ($('input[type="password"]').length > 0 || $('input[name*="password"]').length > 0)
    const hasSearchForm = $('input[type="search"]').length > 0 || $('input[placeholder*="search"]').length > 0
    const hasSubmitButton = $('button[type="submit"]').length > 0 || $('input[type="submit"]').length > 0
    const hasRegistrationForm = $('form').filter((_, f) => {
        const txt = $(f).text().toLowerCase()
        return txt.includes('register') || txt.includes('signup') || txt.includes('create account') || txt.includes('sign up')
    }).length > 0
    
    if (hasLoginForm) {
        workflowMethods.push(`
    // Login workflow
    login(username, password) {
        const usernameInput = this.getInputUsername ? this.getInputUsername() : this.getInputEmail()
        const passwordInput = this.getInputPassword()
        const submitButton = this.getButtonSubmit ? this.getButtonSubmit() : this.getButtonLogin()
        
        if (usernameInput) usernameInput.type(username)
        if (passwordInput) passwordInput.type(password)
        if (submitButton) submitButton.click()
        
        return this
    }`)
    }
    
    if (hasSearchForm) {
        workflowMethods.push(`
    // Search workflow
    search(query) {
        const searchInput = this.getInputSearch ? this.getInputSearch() : this.getInputQuery()
        const searchButton = this.getButtonSearch ? this.getButtonSearch() : this.getButtonSubmit()
        
        if (searchInput) searchInput.type(query)
        if (searchButton) searchButton.click()
        
        return this
    }`)
    }
    
    if (hasRegistrationForm) {
        workflowMethods.push(`
    // Registration workflow
    register(user, email, password) {
        const userInput = this.getInputUsername ? this.getInputUsername() : (this.getInputUser ? this.getInputUser() : (this.getInputName ? this.getInputName() : this.getInputEmail ? this.getInputEmail() : null))
        const emailInput = this.getInputEmail ? this.getInputEmail() : null
        const passwordInput = this.getInputPassword ? this.getInputPassword() : (this.getInputPass ? this.getInputPass() : null)
        const submitButton = this.getButtonRegister ? this.getButtonRegister() : (this.getButtonSignup ? this.getButtonSignup() : (this.getButtonSubmit ? this.getButtonSubmit() : null))
        if (userInput) userInput.type(user)
        if (emailInput && email) emailInput.type(email)
        if (passwordInput) passwordInput.type(password)
        if (submitButton) submitButton.click()
        return this
    }`)
    }

    // Add common workflow methods
    workflowMethods.push(`
    // Navigation workflow
    navigateToHome() {
        const homeLink = this.getLinkHome ? this.getLinkHome() : this.getLinkLogo()
        if (homeLink) homeLink.click()
        return this
    }
    
    // Form submission workflow
    submitForm() {
        const submitButton = this.getButtonSubmit ? this.getButtonSubmit() : this.getButtonLogin()
        if (submitButton) submitButton.click()
        return this
    }
    
    // Wait for page load
    waitForPageLoad() {
        cy.wait(1000) // Adjust as needed
        return this
    }
    
    // Verify page loaded
    verifyPageLoaded() {
        cy.url().should('include', '${new URL(url).hostname}')
        return this
    }`)
    
    return {
        classCode: `export class ${className} {\n  // Private elements\n  #elements = {\n${elements.join(',\n')}\n  }\n\n  // Element meta (currently not used for bulk actions)\n  #meta = ${JSON.stringify(metaMap, null, 2)}\n\n  // Public getters\n${getters.join('\n')}\n\n  // Value/State getters\n${valueGetters.join('\n')}\n\n  // Interaction methods (per-element actions)\n${interactionMethods.join('\n')}\n\n  // Workflow methods\n${workflowMethods.join('\n')}\n}\n`,
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

// Function to generate Cypress test cases
function generateCypressTests($, pageObjectMeta, url) {
    const { className, featureName, elementMeta } = pageObjectMeta
    const elementTests = []
    const formTests = []
    const workflowTests = []
    // Map elementName to type for easy lookup
    const elementTypeMap = Object.fromEntries(elementMeta.map(e => [e.elementName, e.type]))
    // Helper to capitalize
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

    // --- Element-level tests ---
    for (const meta of elementMeta) {
        const { type, elementName } = meta
        if (type === 'button' || type === 'link') {
            elementTests.push(`\n    it('should click ${elementName}', () => {\n        page.click${cap(elementName)}()\n        // Add assertions based on expected behavior\n    })`)
            elementTests.push(`\n    it('should get text of ${elementName}', () => {\n        page.getText${cap(elementName)}().should('be.a', 'string')\n    })`)
        } else if (type === 'checkbox' || type === 'radio') {
            elementTests.push(`\n    it('should check ${elementName}', () => {\n        page.check${cap(elementName)}()\n        page.isChecked${cap(elementName)}()\n    })`)
            elementTests.push(`\n    it('should uncheck ${elementName}', () => {\n        page.uncheck${cap(elementName)}()\n        // Should be unchecked\n    })`)
        } else if (type === 'select' || type === 'textarea' || type === 'input') {
            elementTests.push(`\n    it('should type in ${elementName}', () => {\n        page.type${cap(elementName)}('test input')\n        page.getValue${cap(elementName)}().should('eq', 'test input')\n    })`)
            elementTests.push(`\n    it('should clear ${elementName}', () => {\n        page.type${cap(elementName)}('test')\n        page.clear${cap(elementName)}()\n        page.getValue${cap(elementName)}().should('eq', '')\n    })`)
        }
    }

    // --- Form-level tests ---
    $('form').each((formIdx, form) => {
        const $form = $(form)
        // Find all input/select/textarea in this form
        const fields = []
        $form.find('input,select,textarea').each((_, el) => {
            const $el = $(el)
            let base = ''
            if ($el.is('input')) {
                const type = $el.attr('type') || 'text'
                if (type === 'checkbox' || type === 'radio') {
                    base = `input_${$el.attr('id') || $el.attr('name') || $el.attr('data-testid') || type}`
                } else {
                    base = `input_${$el.attr('id') || $el.attr('name') || $el.attr('data-testid') || type}`
                }
            } else if ($el.is('select')) {
                base = `select_${$el.attr('id') || $el.attr('name') || $el.attr('data-testid') || 'select'}`
            } else if ($el.is('textarea')) {
                base = `textarea_${$el.attr('id') || $el.attr('name') || $el.attr('data-testid') || 'textarea'}`
            }
            // Normalize
            base = base.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
            // Find the closest match in elementMeta
            const match = elementMeta.find(e => e.elementName.startsWith(base))
            if (match) {
                fields.push({ ...match, elementName: match.elementName })
            }
        })
        // Find submit button in form
        let submitBtn = null
        $form.find('button[type="submit"],input[type="submit"]').each((_, el) => {
            const $el = $(el)
            let base = ''
            if ($el.is('button')) {
                base = `button_${$el.attr('id') || $el.text().trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'submit'}`
            } else {
                base = `input_${$el.attr('id') || $el.attr('name') || $el.attr('data-testid') || 'submit'}`
            }
            base = base.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
            const match = elementMeta.find(e => e.elementName.startsWith(base))
            if (match) submitBtn = match.elementName
        })
        // --- Positive test ---
        if (fields.length && submitBtn) {
            const validData = fields.map(f => {
                if (f.type === 'checkbox' || f.type === 'radio') return `page.check${cap(f.elementName)}()`
                return `page.type${cap(f.elementName)}('valid_${f.elementName}')`
            }).join('\n        ')
            formTests.push(`\n    it('should submit form with valid data', () => {\n        ${validData}\n        page.click${cap(submitBtn)}()\n        // Add assertions for successful submission\n    })`)
        }
        // --- Negative tests: missing required fields ---
        fields.forEach(f => {
            if (f.type === 'checkbox' || f.type === 'radio') {
                formTests.push(`\n    it('should show error if ${f.elementName} is not checked', () => {\n        // Do not check\n        page.click${cap(submitBtn)}()\n        // Add assertions for error\n    })`)
            } else {
                formTests.push(`\n    it('should show error if ${f.elementName} is empty', () => {\n        ${fields.filter(ff => ff.elementName !== f.elementName).map(ff => ff.type === 'checkbox' || ff.type === 'radio' ? `page.check${cap(ff.elementName)}()` : `page.type${cap(ff.elementName)}('valid_${ff.elementName}')`).join('\n        ')}\n        // Leave ${f.elementName} empty\n        page.click${cap(submitBtn)}()\n        // Add assertions for error\n    })`)
            }
        })
        // --- Edge case tests ---
        fields.forEach(f => {
            if (f.type !== 'checkbox' && f.type !== 'radio') {
                formTests.push(`\n    it('should handle long input for ${f.elementName}', () => {\n        page.type${cap(f.elementName)}('a'.repeat(1000))\n        page.click${cap(submitBtn)}()\n        // Add assertions for edge case\n    })`)
                formTests.push(`\n    it('should handle special characters for ${f.elementName}', () => {\n        page.type${cap(f.elementName)}('!@#$%^&*()_+-=[]{}|;:,.<>?')\n        page.click${cap(submitBtn)}()\n        // Add assertions for edge case\n    })`)
            }
        })
    })

    // --- Workflow tests (login, register, search, etc) ---
    // If the page object has a login/search/register method, generate workflow tests
    if (typeof pageObjectMeta.classCode === 'string') {
        if (/login\s*\(/.test(pageObjectMeta.classCode)) {
            workflowTests.push(`\n    describe('Login Workflow', () => {\n        it('should login with valid credentials', () => {\n            page.login('validuser', 'validpassword')\n            // Add assertions for successful login\n        })\n        it('should show error with invalid credentials', () => {\n            page.login('invaliduser', 'wrongpassword')\n            // Add assertions for error\n        })\n        it('should show error with empty username', () => {\n            page.login('', 'password')\n            // Add assertions for error\n        })\n        it('should show error with empty password', () => {\n            page.login('username', '')\n            // Add assertions for error\n        })\n    })`)
        }
        if (/search\s*\(/.test(pageObjectMeta.classCode)) {
            workflowTests.push(`\n    describe('Search Workflow', () => {\n        it('should search with valid query', () => {\n            page.search('test query')\n            // Add assertions for search results\n        })\n        it('should handle empty search query', () => {\n            page.search('')\n            // Add assertions for empty search\n        })\n    })`)
        }
        if (/register\s*\(/.test(pageObjectMeta.classCode)) {
            workflowTests.push(`\n    describe('Register Workflow', () => {\n        it('should register with valid data', () => {\n            page.register('user', 'email@example.com', 'password')\n            // Add assertions for successful registration\n        })\n        it('should show error with invalid data', () => {\n            page.register('', '', '')\n            // Add assertions for error\n        })\n    })`)
        }
    }

    // --- Compose the test file ---
    return `import { ${className} } from '../pages/${featureName}'\n\ndescribe('${className} Tests', () => {\n    let page\n    beforeEach(() => {\n        cy.visit('${url}')\n        page = new ${className}()\n    })\n    describe('Element Interactions', () => {\n${elementTests.join('\n')}\n    })\n    describe('Form Submission', () => {\n${formTests.join('\n')}\n    })\n${workflowTests.join('\n')}\n    // Add more negative/error/edge case tests as needed\n})`
} 

// Copilot generated code ends here

// Tools (updated to registerTool API replacing deprecated server.tool style)
server.registerTool(
    'createCypressFiles',
    {
        title: 'Create Cypress Files',
        description: 'Create Page Object and Test files directly in the Cypress project',
        inputSchema: {
            url: z.string().describe('URL of the web page'),
            workspacePath: z.string().optional().describe('Workspace path (optional, it is detected automatically if not provided)'),
            pageObjectName: z.string().optional().describe('Custom name for the page object (optional)')
        }
    },
    async ({ url, workspacePath, pageObjectName }) => {
        const fileManager = new CypressFileManager()
        try {
            const workspaceRoot = await fileManager.detectWorkspace(workspacePath)
            await fileManager.ensureDirectoryStructure(workspaceRoot)
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
            const page = await browser.newPage()
            await page.goto(url, { waitUntil: 'networkidle2' })
            const html = await page.content()
            await browser.close()
            const $ = cheerio.load(html)
            const pageObjectMeta = generatePageObjectClass($, url, pageObjectName)
            const cypressTests = generateCypressTests($, pageObjectMeta, url)
            const pageObjectPath = await fileManager.createPageObject(workspaceRoot, url, pageObjectMeta)
            const testFilePath = await fileManager.createTestFile(workspaceRoot, url, cypressTests, pageObjectMeta.featureName)
            const indexPath = await fileManager.createIndexFile(workspaceRoot)
            return {
                content: [
                    { type: 'text', text: `✅ Files created successfully:\n\n📄 Page Object: ${pageObjectPath}\n🧪 Test File: ${testFilePath}\n📋 Index File: ${indexPath}\n\nWorkspace detected: ${workspaceRoot}\n\nNow you can import the page object in your tests using:\nimport { ${pageObjectMeta.className} } from '../pages/${pageObjectMeta.featureName}'` }
                ]
            }
        } catch (error) {
            return { content: [ { type: 'text', text: `❌ Error creating Cypress files: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure you are in a directory with a valid Cypress project.` } ] }
        }
    }
)

server.registerTool(
    'generateLocator',
    {
        title: 'Generate Locator & Tests',
        description: 'Generate Cypress Page Object and Tests',
        inputSchema: { url: z.string().describe('Web page URL') }
    },
    async ({ url }) => {
        try {
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
            const page = await browser.newPage()
            await page.goto(url, { waitUntil: 'networkidle2' })
            const html = await page.content()
            await browser.close()
            const $ = cheerio.load(html)
            const pageObjectMeta = generatePageObjectClass($, url)
            const className = generateClassName(url)
            const cypressTests = generateCypressTests($, pageObjectMeta, url)
            return { content: [ { type: 'text', text: `// ===== PAGE OBJECT CLASS =====\n// Save this as: ${className}.ts\n\n${pageObjectMeta.classCode}\n\n// ===== CYPRESS TESTS =====\n// Save this as: ${className}.cy.ts\n\n${cypressTests}` } ] }
        } catch (error) {
            return { content: [ { type: 'text', text: `Error generating Page Object and Tests: ${error instanceof Error ? error.message : 'Unknown error'}` } ] }
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

