# Playwright MCP Server Integration

This dashboard now includes integration with Playwright MCP (Model Context Protocol) server for advanced visual testing and UI automation capabilities.

## Features

### 🎭 Visual Testing Mode
- Toggle visual testing mode from the sidebar
- Real-time component testing with visual regression detection
- Individual component testing with hover-to-test functionality
- Automated screenshot capture and comparison

### 🔌 MCP Server Integration
- Real-time connection status monitoring
- Automatic server health checks
- Version tracking and compatibility verification
- Error handling and reconnection logic

### 📊 Test Results Dashboard
- Live test execution status
- Historical test results with timestamps
- Pass/fail indicators with visual feedback
- Component-specific test targeting

## Setup Instructions

### 1. Install Playwright MCP Server
```bash
# Install globally
npm run install-mcp

# Or install manually
npm install -g @playwright/mcp@latest
```

### 2. Configure Cursor IDE
Add the following to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--config", "playwright-mcp.config.json"]
    }
  }
}
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Enable Visual Testing
1. Navigate to the Admin Dashboard
2. Click "Visual Testing" in the sidebar
3. The dashboard will enter testing mode
4. Use "Test All" or hover over components to test individually

## Configuration

The `playwright-mcp.config.json` file contains:

- **Browser Settings**: Chrome, viewport size, headless mode
- **Visual Testing**: Threshold settings, diff colors
- **Component Targets**: Specific selectors for testing
- **Output Settings**: Screenshot and trace saving

## Component Testing

### Testable Components
- **Dashboard Stats Cards**: Individual metric cards
- **Student List Table**: Data table with filtering
- **Navigation Sidebar**: Menu and MCP status
- **QR Scanner Section**: Quick access panel

### Test Types
1. **Visual Regression**: Compare against baseline screenshots
2. **Component Isolation**: Test individual UI components
3. **Responsive Testing**: Multiple viewport sizes
4. **Interaction Testing**: Hover states and animations

## Usage Examples

### Manual Testing
```typescript
// Test a specific component
runVisualTest('Dashboard Stats Cards');

// Capture full dashboard screenshot
captureScreenshot();
```

### Automated Testing
```bash
# Run all visual tests
npm run test:visual

# Run with specific configuration
npx @playwright/mcp@latest --config custom-config.json
```

## MCP Server Commands

The integration supports these MCP commands:
- `browser_navigate`: Navigate to specific URLs
- `browser_resize`: Change viewport dimensions
- `browser_take_screenshot`: Capture screenshots
- `browser_click`: Interact with elements
- `browser_type`: Input text
- `browser_scroll`: Scroll page content

## Troubleshooting

### Connection Issues
1. Ensure Playwright MCP server is installed globally
2. Check Cursor MCP configuration
3. Verify port availability (default: 3000)
4. Review browser permissions

### Test Failures
1. Check component selectors in config
2. Verify viewport settings
3. Review threshold sensitivity
4. Examine diff images in output directory

### Performance
1. Use headless mode for faster execution
2. Limit concurrent tests
3. Optimize component selectors
4. Clean output directory regularly

## Best Practices

### Test Organization
- Group related components
- Use descriptive test names
- Maintain baseline screenshots
- Document test scenarios

### Configuration Management
- Version control config files
- Environment-specific settings
- Regular threshold reviews
- Automated cleanup scripts

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Visual Tests
on: [push, pull_request]
jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright MCP
        run: npm run install-mcp
      - name: Run visual tests
        run: npm run test:visual
```

## Advanced Features

### Custom Test Scenarios
Create custom test configurations for:
- Dark/light theme testing
- Mobile responsiveness
- Accessibility compliance
- Performance monitoring

### Integration with Other Tools
- Combine with Jest for unit tests
- Use with Storybook for component testing
- Integrate with monitoring tools
- Export results to analytics platforms

## Support

For issues and questions:
1. Check the [Playwright MCP documentation](https://github.com/microsoft/playwright-mcp)
2. Review Cursor MCP integration guides
3. Examine browser console for errors
4. Enable debug logging in configuration

---

*This integration demonstrates how modern development tools can work together to create sophisticated testing workflows that improve UI quality and development velocity.*