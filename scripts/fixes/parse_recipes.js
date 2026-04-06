const XLSX = require('xlsx');
const fs = require('fs');

const SKIP_SHEETS = ['MENUCOMIDA', 'ENTRADA', 'Sheet43', 'Sheet44'];

function parseRecipe(sheet, name) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (data.length < 5) return null;
  
  // Find ingredient rows and totals
  const ingredients = [];
  let total_cost = null;
  let suggested_price = null;
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const cell0 = String(row[0]).trim().toUpperCase();
    
    // Skip header row
    if (cell0 === 'PRODUCTO' || cell0 === 'A') continue;
    
    // Check for totals
    if (cell0.includes('COSTO') && !cell0.includes('UNITARIO') && !cell0.includes('ÚTIL')) {
      // Look for the cost value in the row
      for (let c = 1; c < row.length; c++) {
        const v = parseFloat(row[c]);
        if (!isNaN(v) && v > 0) { total_cost = v; break; }
      }
      continue;
    }
    if (cell0.includes('PRECIO') && cell0.includes('SUGERIDO')) {
      for (let c = 1; c < row.length; c++) {
        const v = parseFloat(row[c]);
        if (!isNaN(v) && v > 0) { suggested_price = v; break; }
      }
      continue;
    }
    if (cell0.includes('PRECIO') || cell0.includes('TOTAL') || cell0.includes('VENTA')) continue;
    
    const qty = parseFloat(row[2]);
    if (isNaN(qty)) continue;
    
    ingredients.push({
      name: String(row[0]).trim(),
      description: String(row[1] || '').trim(),
      quantity: qty,
      unit: String(row[3] || '').trim(),
      presentation: String(row[4] || '').trim(),
      yield_pct: parseFloat(row[5]) || 0,
      waste_pct: parseFloat(row[6]) || 0,
      unit_cost: parseFloat(row[7]) || 0,
      useful_cost: parseFloat(row[8]) || 0,
      total_cost: parseFloat(row[9]) || 0
    });
  }
  
  if (ingredients.length === 0) return null;
  
  return {
    recipe_name: name,
    total_cost: total_cost || ingredients.reduce((s, i) => s + i.total_cost, 0),
    suggested_price: suggested_price || null,
    ingredients
  };
}

const recipes = [];
const allIngredients = new Map(); // name -> {units, count}

for (const file of ['spread1.xlsx']) {
  const wb = XLSX.readFile(file);
  console.log(`\n${file}: ${wb.SheetNames.length} sheets: ${wb.SheetNames.join(', ')}`);
  
  for (const name of wb.SheetNames) {
    if (SKIP_SHEETS.includes(name)) { console.log(`  SKIP: ${name}`); continue; }
    const recipe = parseRecipe(wb.Sheets[name], name);
    if (recipe) {
      recipes.push(recipe);
      console.log(`  ✓ ${name}: ${recipe.ingredients.length} ingredients, cost=${recipe.total_cost}, price=${recipe.suggested_price}`);
      for (const ing of recipe.ingredients) {
        const key = ing.name.toUpperCase();
        if (!allIngredients.has(key)) {
          allIngredients.set(key, { name: ing.name, units: new Set(), count: 0 });
        }
        const entry = allIngredients.get(key);
        if (ing.unit) entry.units.add(ing.unit);
        entry.count++;
      }
    } else {
      console.log(`  SKIP (no data): ${name}`);
    }
  }
}

fs.writeFileSync('recetas_llorona.json', JSON.stringify(recipes, null, 2));
console.log(`\nTotal recipes: ${recipes.length}`);

const insumos = [...allIngredients.values()]
  .map(v => ({ name: v.name, units: [...v.units], recipe_count: v.count }))
  .sort((a, b) => b.recipe_count - a.recipe_count);
fs.writeFileSync('insumos_llorona.json', JSON.stringify(insumos, null, 2));
console.log(`Total unique ingredients: ${insumos.length}`);
