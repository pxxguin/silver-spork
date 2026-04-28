const fs = require('fs');
const files = [
  './frontend/src/components/TaskATab.jsx',
  './frontend/src/components/TaskBTab.jsx',
  './frontend/src/components/TaskCTab.jsx',
  './frontend/src/components/TaskDTab.jsx'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // Replace string literals: 'http://localhost:8000/api...' -> API_URL + '/api...'
  content = content.replace(/'http:\/\/localhost:8000\//g, "API_URL + '/");
  // Replace template literals: `http://localhost:8000/api...` -> `${API_URL}/api...`
  content = content.replace(/http:\/\/localhost:8000/g, "${API_URL}");
  fs.writeFileSync(f, content);
});
console.log('Replaced successfully');
