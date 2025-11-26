const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const ignoreDirs = ['node_modules', '.git', '.expo', 'dist', 'build', 'coverage', 'test-results', 'playwright-report'];

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                getAllFiles(filePath, fileList);
            }
        } else {
            if (extensions.includes(path.extname(file))) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const allFiles = getAllFiles(rootDir);
const fileMap = new Map(); // path -> { imports: [], importedBy: [] }

// Initialize map
allFiles.forEach(f => {
    fileMap.set(f, { imports: [], importedBy: [] });
});

// Regex for imports
const importRegex = /import\s+(?:[\w\s{},*]+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;

allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (importPath && (importPath.startsWith('.') || importPath.startsWith('@/'))) {
            // Resolve path
            let resolvedPath = '';
            if (importPath.startsWith('@/')) {
                resolvedPath = path.join(rootDir, importPath.replace('@/', ''));
            } else {
                resolvedPath = path.resolve(path.dirname(file), importPath);
            }

            // Try extensions
            let found = false;
            const possiblePaths = [
                resolvedPath,
                resolvedPath + '.ts',
                resolvedPath + '.tsx',
                resolvedPath + '.js',
                resolvedPath + '.jsx',
                path.join(resolvedPath, 'index.ts'),
                path.join(resolvedPath, 'index.tsx'),
                path.join(resolvedPath, 'index.js'),
                path.join(resolvedPath, 'index.jsx')
            ];

            for (const p of possiblePaths) {
                if (fileMap.has(p)) {
                    fileMap.get(file).imports.push(p);
                    fileMap.get(p).importedBy.push(file);
                    found = true;
                    break;
                }
            }
        }
    }
});

// Identify Dead Files
// Entry points: index.js, App.tsx, app/**/* (Expo Router), focusflow-backend/index.js
const entryPoints = allFiles.filter(f =>
    f.endsWith('index.js') ||
    f.endsWith('App.tsx') ||
    f.includes('/app/') ||
    f.includes('/focusflow-backend/index.js')
);

const deadFiles = [];
const visited = new Set();

function traverse(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const data = fileMap.get(file);
    if (data) {
        data.imports.forEach(imp => traverse(imp));
    }
}

entryPoints.forEach(ep => traverse(ep));

allFiles.forEach(f => {
    if (!visited.has(f)) {
        deadFiles.push(f);
    }
});

// Circular Dependencies
const cycles = [];
const recursionStack = new Set();
const visitedCycle = new Set();

function checkCycle(file, pathStack) {
    visitedCycle.add(file);
    recursionStack.add(file);

    const imports = fileMap.get(file)?.imports || [];
    for (const imp of imports) {
        if (!visitedCycle.has(imp)) {
            checkCycle(imp, [...pathStack, imp]);
        } else if (recursionStack.has(imp)) {
            cycles.push([...pathStack, imp]);
        }
    }

    recursionStack.delete(file);
}

allFiles.forEach(f => {
    if (!visitedCycle.has(f)) {
        checkCycle(f, [f]);
    }
});

console.log(JSON.stringify({
    deadFiles: deadFiles.map(f => path.relative(rootDir, f)),
    cycles: cycles.map(c => c.map(f => path.relative(rootDir, f))),
    fileCount: allFiles.length,
    entryPoints: entryPoints.map(f => path.relative(rootDir, f))
}, null, 2));
