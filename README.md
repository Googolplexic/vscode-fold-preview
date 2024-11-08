# Origami FOLD File Visualizer and Format

A VS Code extension for previewing and editing FOLD (Flexible Origami List Datastructure) files. This extension provides syntax highlighting, formatting, and an interactive preview for .fold files.

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/ColemanLai.fold-preview)](https://marketplace.visualstudio.com/items?itemName=ColemanLai.fold-preview)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/ColemanLai.fold-preview)](https://marketplace.visualstudio.com/items?itemName=ColemanLai.fold-preview)
[![GitHub](https://img.shields.io/github/license/Googolplexic/vscode-fold-preview)](https://github.com/Googolplexic/vscode-fold-preview/blob/main/LICENSE)

## Features

### Interactive Preview
- Live preview of FOLD files with pan and zoom capabilities
- Full-window canvas support for maximum visibility
- Customizable visualization of mountain, valley, and boundary folds
- Auto-updates as you edit the file
- Keyboard shortcuts for common actions
- Dynamic legend showing fold types and label styles
- Optional indexed labeling system for vertices, edges, and faces
- Automatic scaling of labels with zoom level

### Editor Features
- Syntax highlighting for .fold files
- JSON formatting with customizable indentation
- Format on save support
- Custom file icon with folded corner design
- Bracket matching and auto-closing pairs

## Installation

Install from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ColemanLai.fold-preview) or:

1. Open VS Code
2. Press `Ctrl+P` (`Cmd+P` on macOS)
3. Type `ext install ColemanLai.fold-preview`
4. Press Enter

## Usage

### Opening the Preview
- Click the "Open Preview to the Side" button in the editor title area
- Use the keyboard shortcut `Ctrl+K V` (`Cmd+K V` on macOS)
- Right-click on a .fold file and select "Open With... > FOLD Preview"

### Preview Controls
- Zoom: Mouse wheel or `+`/`-` keys
- Pan: Click and drag
- Reset View: `R` key or "Reset Zoom" button
- Fit to View: `F` key or "Fit to View" button
- Labels: Toggle vertex, edge, and face indices using checkboxes

### Formatting
- Use `Shift+Alt+F` to format the document
- Right-click and select "Format Document"
- Enable format on save in VS Code settings

## Configuration

All settings can be configured through VS Code's Settings UI (File > Preferences > Settings > Extensions > FOLD Preview) or settings.json.

### Colors
Customize the colors for different fold types:
```json
{
    "fold-preview.colors.mountain": "#FF0000",
    "fold-preview.colors.valley": "#0000FF",
    "fold-preview.colors.boundary": "#000000",
    "fold-preview.colors.flat": "#808080",
    "fold-preview.colors.unassigned": "#CCCCCC"
}
```

### Label System
Configure the appearance of index labels:
```json
{
    "fold-preview.labels.circleRadius": 10,
    "fold-preview.labels.vertex.background": "#FFE082",
    "fold-preview.labels.edge.background": "#90CAF9",
    "fold-preview.labels.face.background": "#EF9A9A",
    "fold-preview.labels.circleBorder": "#000000",
    "fold-preview.labels.borderWidth": 1,
    "fold-preview.labels.fontSize": 12,
    "fold-preview.labels.textColor": "#000000",
    "fold-preview.labels.offset": 16
}
```
Label features include:
- Zoom-aware scaling of label size and text
- Dynamic visibility based on data availability
- Distinct background colors for vertex, edge, and face labels
- Legend showing label styles
- Face labels automatically hide when faces are not defined in the FOLD file

### Line Styles
Configure line appearance:
```json
{
    "fold-preview.lineStyles.lineWidth": 2,
    "fold-preview.lineStyles.mountainStyle": "dashed-dotted",
    "fold-preview.lineStyles.valleyStyle": "dashed"
}
```
Available line styles:
- `solid`: Continuous line
- `dashed`: Dashed line (- - -)
- `dotted`: Dotted line (. . .)
- `dashed-dotted`: Dash-dot line (-.-.-.)

### Vertices
Control vertex display:
```json
{
    "fold-preview.vertices.show": true,
    "fold-preview.vertices.radius": 2,
    "fold-preview.vertices.color": "#000000"
}
```

### Canvas
Adjust canvas appearance:
```json
{
    "fold-preview.canvas.backgroundColor": "#FFFFFF",
    "fold-preview.canvas.padding": 40,
    "fold-preview.canvas.zoomSpeed": 0.1,
    "fold-preview.tabSize": 2
}
```

Default settings will be applied on first use but can be customized at any time through the Settings UI or settings.json.

## Requirements

- Visual Studio Code version 1.80.0 or higher

## Known Issues and Feature Requests

Please report any issues or feature requests on the [GitHub repository](https://github.com/Googolplexic/vscode-fold-preview/issues).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- FOLD file specification: https://github.com/edemaine/fold
- Claude AI by Anthropic

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Release Notes

See [CHANGELOG.md](https://github.com/Googolplexic/vscode-fold-preview/blob/main/CHANGELOG.md)

---

**Enjoy!**
