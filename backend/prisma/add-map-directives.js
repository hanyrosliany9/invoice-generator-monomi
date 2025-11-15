#!/usr/bin/env node

/**
 * Script to add @@map directives to Prisma schema
 * Converts snake_case table names to PascalCase model names
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Function to convert snake_case to PascalCase
function snakeToPascal(str) {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Process the schema
const lines = schema.split('\n');
const output = [];
let inModel = false;
let currentModelName = '';
let modelIndent = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect model start
  const modelMatch = line.match(/^(model)\s+(\w+)\s*\{/);
  if (modelMatch) {
    inModel = true;
    currentModelName = modelMatch[2];
    const pascalName = snakeToPascal(currentModelName);

    // If model name is snake_case, rename it and add @@map
    if (currentModelName !== pascalName && currentModelName.includes('_')) {
      output.push(`model ${pascalName} {`);
      console.log(`Renaming: ${currentModelName} -> ${pascalName}`);
    } else {
      output.push(line);
    }
    continue;
  }

  // Detect model end
  if (inModel && line.match(/^\}/)) {
    // Check if @@map already exists
    const hasMap = output.slice(-10).some(l => l.includes('@@map'));

    if (!hasMap && currentModelName !== snakeToPascal(currentModelName) && currentModelName.includes('_')) {
      // Add @@map before closing brace
      const lastNonEmptyIndex = output.length - 1;
      while (output[lastNonEmptyIndex].trim() === '') {
        output.pop();
      }
      output.push(`  @@map("${currentModelName}")`);
      output.push('');
    }

    output.push(line);
    inModel = false;
    currentModelName = '';
    continue;
  }

  output.push(line);
}

// Write the updated schema
fs.writeFileSync(schemaPath, output.join('\n'), 'utf8');
console.log('✅ Schema updated successfully!');
console.log('Run: npx prisma generate to regenerate the client');
