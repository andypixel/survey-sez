#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Default data structures
const defaultCategories = {
  "universal": [
    {
      "id": "fruit",
      "name": "Fruit",
      "entries": ["Apple", "Banana", "Orange", "Kiwi", "Mango", "Grapefruit", "Pineapple", "Peach", "Pear", "Cherry"]
    },
    {
      "id": "animals",
      "name": "Animals", 
      "entries": ["Dog", "Cat", "Elephant", "Lion", "Tiger", "Bear", "Rabbit", "Horse", "Cow", "Pig"]
    },
    {
      "id": "colors",
      "name": "Colors",
      "entries": ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Pink", "Brown", "Black", "White"]
    }
  ],
  "custom": {}
};

const defaultRooms = {};
const defaultUsers = {};

// Initialize data files
function initDataFiles() {
  const files = [
    { name: 'categories.json', data: defaultCategories },
    { name: 'rooms.json', data: defaultRooms },
    { name: 'users.json', data: defaultUsers }
  ];

  files.forEach(file => {
    const filePath = path.join(dataDir, file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(file.data, null, 2));
      console.log(`Created ${file.name}`);
    } else {
      console.log(`${file.name} already exists, skipping`);
    }
  });
}

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

initDataFiles();
console.log('Development data initialization complete');