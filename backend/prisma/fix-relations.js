#!/usr/bin/env node

/**
 * Script to fix relation types in Prisma schema
 * Converts snake_case relation types to PascalCase
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

// Get all model names (both old and new)
const modelMap = new Map();
const modelRegex = /^model\s+(\w+)\s*\{[\s\S]*?@@map\("(\w+)"\)/gm;
let match;

while ((match = modelRegex.exec(schema)) !== null) {
  const pascalName = match[1];
  const snakeName = match[2];
  modelMap.set(snakeName, pascalName);
}

console.log(`Found ${modelMap.size} models with @@map directives`);

// Replace relation types
let replacements = 0;
for (const [snakeName, pascalName] of modelMap.entries()) {
  // Match relation fields: fieldName snake_case_type @relation(...)
  // or fieldName snake_case_type[] @relation(...)
  // or fieldName snake_case_type? @relation(...)
  const relationRegex = new RegExp(
    `(\\s+)(\\w+)(\\s+)${snakeName}([\\[\\]?]*)`,
    'g'
  );

  const before = schema;
  schema = schema.replace(relationRegex, (match, space1, fieldName, space2, suffix) => {
    replacements++;
    return `${space1}${fieldName}${space2}${pascalName}${suffix}`;
  });
}

console.log(`Replaced ${replacements} relation type references`);

// Write the updated schema
fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('✅ Relations fixed successfully!');
console.log('Run: npx prisma generate to regenerate the client');
