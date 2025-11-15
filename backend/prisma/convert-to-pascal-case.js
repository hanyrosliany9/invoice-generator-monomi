#!/usr/bin/env node

/**
 * Comprehensive script to convert Prisma schema from snake_case to PascalCase
 * - Renames models to PascalCase
 * - Adds @@map directives to preserve database table names
 * - Updates all relation types to use PascalCase model names
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Function to convert snake_case to PascalCase
function snakeToPascal(str) {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

console.log('=== Step 1: Building model name mapping ===');

// First pass: identify all models and build mapping
const modelMap = new Map();
const lines = schema.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    const snakeName = modelMatch[1];
    const pascalName = snakeToPascal(snakeName);
    if (snakeName !== pascalName) {
      modelMap.set(snakeName, pascalName);
      console.log(`  ${snakeName} -> ${pascalName}`);
    }
  }
}

console.log(`\nFound ${modelMap.size} models to rename\n`);

console.log('=== Step 2: Renaming models and adding @@map directives ===');

// Second pass: rename models and add @@map
const output = [];
let inModel = false;
let currentModelSnakeName = '';
let currentModelPascalName = '';
let modelContent = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect model start
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    inModel = true;
    currentModelSnakeName = modelMatch[1];
    currentModelPascalName = modelMap.get(currentModelSnakeName) || currentModelSnakeName;
    modelContent = [];

    // Write model declaration with PascalCase name
    output.push(`model ${currentModelPascalName} {`);
    continue;
  }

  // Detect model end
  if (inModel && line.match(/^\}/)) {
    // Add @@map directive if model was renamed
    if (modelMap.has(currentModelSnakeName)) {
      // Check if @@map already exists in content
      const hasMap = modelContent.some(l => l.includes('@@map'));
      if (!hasMap) {
        // Remove trailing empty lines
        while (modelContent.length > 0 && modelContent[modelContent.length - 1].trim() === '') {
          modelContent.pop();
        }
        modelContent.push('');
        modelContent.push(`  @@map("${currentModelSnakeName}")`);
      }
    }

    // Write model content and closing brace
    output.push(...modelContent);
    output.push(line);

    inModel = false;
    currentModelSnakeName = '';
    currentModelPascalName = '';
    modelContent = [];
    continue;
  }

  // Collect model content
  if (inModel) {
    modelContent.push(line);
  } else {
    output.push(line);
  }
}

schema = output.join('\n');

console.log('✅ Models renamed and @@map directives added\n');

console.log('=== Step 3: Updating relation types ===');

// Third pass: update relation field types
let replacements = 0;
for (const [snakeName, pascalName] of modelMap.entries()) {
  // Pattern: whitespace + fieldName + whitespace + TYPE + optional([], ?)
  // We need to replace TYPE when it matches a renamed model
  //
  // Example matches:
  //   chart_of_accounts chart_of_accounts @relation
  //   users             users[]
  //   client            clients?           @relation
  //
  // Pattern explanation:
  // (^|\s+)        - start of line or whitespace (field indentation)
  // (\w+)          - field name (capture group 2)
  // (\s+)          - whitespace between field name and type
  // snakeName      - the type we're looking for (exact match)
  // ([\[\]?]*)     - optional [], ?, or combination (capture group 4)
  // (\s|$)         - followed by whitespace or end of line

  const typeRegex = new RegExp(
    `(^|\\s+)(\\w+)(\\s+)${snakeName}([\\[\\]?]*)(\\s|$)`,
    'gm'
  );

  schema = schema.replace(typeRegex, (match, prefix, fieldName, space, suffix, trailing) => {
    replacements++;
    return `${prefix}${fieldName}${space}${pascalName}${suffix}${trailing}`;
  });
}

console.log(`✅ Replaced ${replacements} relation type references\n`);

// Write the final schema
fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('=== ✅ Schema conversion complete! ===');
console.log('\nNext steps:');
console.log('1. Run: npx prisma format');
console.log('2. Run: npx prisma generate');
console.log('3. Run: npx prisma migrate dev --create-only --name rename_models_to_pascal_case');
