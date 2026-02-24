// ══════════════════════════════════════
// ZERO WASTE KITCHEN — Standalone PWA V3
// ══════════════════════════════════════

const CUISINES=[{id:"any",label:"Surprise Me",emoji:"🌍"},{id:"indian",label:"Indian",emoji:"🇮🇳"},{id:"chinese",label:"Chinese",emoji:"🇨🇳"},{id:"japanese",label:"Japanese",emoji:"🇯🇵"},{id:"korean",label:"Korean",emoji:"🇰🇷"},{id:"thai",label:"Thai",emoji:"🇹🇭"},{id:"mexican",label:"Mexican",emoji:"🇲🇽"},{id:"italian",label:"Italian",emoji:"🇮🇹"},{id:"mediterranean",label:"Mediterranean",emoji:"🫒"},{id:"american",label:"American",emoji:"🇺🇸"},{id:"french",label:"French",emoji:"🇫🇷"},{id:"middle_eastern",label:"Middle Eastern",emoji:"🧆"}];
const DIETS=[{id:"none",label:"None",icon:"🍽️"},{id:"vegetarian",label:"Vegetarian",icon:"🥬"},{id:"vegan",label:"Vegan",icon:"🌱"},{id:"gluten_free",label:"Gluten-Free",icon:"🚫🌾"},{id:"dairy_free",label:"Dairy-Free",icon:"🚫🥛"}];
const TIME_MODES=[{id:"quick",label:"Quick",sub:"Under 15 min",emoji:"⚡"},{id:"standard",label:"Standard",sub:"15–45 min",emoji:"🍳"},{id:"weekend",label:"Weekend Chef",sub:"45+ min",emoji:"👨‍🍳"},{id:"mealprep",label:"Meal Prep",sub:"Batch cook",emoji:"📦"},{id:"exploring",label:"Exploring",sub:"Show me all",emoji:"🔍"}];
const SPICE_LEVELS=[{id:"mild",label:"Mild",emoji:"🫑",color:"#6B8E23"},{id:"medium",label:"Medium",emoji:"🌶️",color:"#CC8844"},{id:"spicy",label:"Spicy",emoji:"🔥",color:"#C75B39"},{id:"extra_hot",label:"Extra Hot",emoji:"💀",color:"#B22222"}];
const SKILL_LEVELS=[{id:"beginner",label:"Beginner",emoji:"🥄"},{id:"intermediate",label:"Intermediate",emoji:"🔪"},{id:"advanced",label:"Advanced",emoji:"🧑‍🍳"}];
const MEAL_TYPES=[{id:"any",label:"Any",emoji:"🍽️"},{id:"breakfast",label:"Breakfast",emoji:"🌅"},{id:"lunch",label:"Lunch",emoji:"☀️"},{id:"dinner",label:"Dinner",emoji:"🌙"},{id:"snack",label:"Snack",emoji:"🍿"},{id:"dessert",label:"Dessert",emoji:"🍰"},{id:"side",label:"Side Dish",emoji:"🥗"}];
const FITNESS_GOALS=[{id:"none",label:"None",emoji:"➖"},{id:"high_protein",label:"High Protein",emoji:"💪"},{id:"low_carb",label:"Low Carb",emoji:"📉"},{id:"keto",label:"Keto",emoji:"🥑"},{id:"bulking",label:"Bulking",emoji:"🏋️"},{id:"cutting",label:"Cutting",emoji:"✂️"},{id:"balanced",label:"Balanced",emoji:"⚖️"}];
const PANTRY=["Salt","Pepper","Cooking Oil","Butter","Garlic","Ginger","Soy Sauce","Sugar","Flour","Cumin","Chili Flakes","Vinegar","Ketchup","Mustard"];
const QUICK_ADDS=["Potato","Onion","Tomato","Carrot","Rice","Eggs","Chicken","Bell Pepper","Spinach","Mushroom","Paneer","Tofu","Pasta","Bread","Cheese","Lemon","Beans","Cabbage","Peas","Milk"];

// ── State ──
let S = {
  isDark: false,
  ingredients: [], inputVal: "",
  cuisine: "any", diet: "none", timeMode: "standard",
  spice: "medium", skill: "intermediate",
  mealType: "any", fitnessGoal: "none",
  servings: 2, count: 3,
  pantryOn: true, pantrySet: new Set(PANTRY), showPantry: false,
  recipes: null, loading: false, error: null, wasteScore: null,
  savedRecipes: [], showSaved: false, showSettings: false,
  apiKey: "", toast: null, openRecipes: new Set([0]),
  editingQty: null,
  // Collapsible sections: track which are open
  openSections: new Set(["ingredients"]),
};

// ── Persistence ──
function load() {
  try {
    const k = localStorage.getItem("zwk_key"); if (k) S.apiKey = k;
    const s = localStorage.getItem("zwk_saved"); if (s) S.savedRecipes = JSON.parse(s);
    const d = localStorage.getItem("zwk_dark"); if (d) S.isDark = JSON.parse(d);
  } catch(e) {}
}
function saveKey() { try { localStorage.setItem("zwk_key", S.apiKey); } catch(e) {} }
function saveSaved() { try { localStorage.setItem("zwk_saved", JSON.stringify(S.savedRecipes)); } catch(e) {} }
function saveDark() { try { localStorage.setItem("zwk_dark", JSON.stringify(S.isDark)); } catch(e) {} }
load();

// ── Helpers ──
function el(tag, attrs, ...ch) {
  const e = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k,v]) => {
    if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "className") e.className = v;
    else if (k === "innerHTML") e.innerHTML = v;
    else e.setAttribute(k, v);
  });
  ch.flat(Infinity).forEach(c => {
    if (c == null || c === false) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

function toast(msg) {
  S.toast = msg; render();
  setTimeout(() => { S.toast = null; render(); }, 2000);
}

function toggleSection(id) {
  if (S.openSections.has(id)) S.openSections.delete(id);
  else S.openSections.add(id);
  render();
}

// ── Build chips ──
function chips(items, selected, onSelect, extraClass) {
  return el("div", { className: "chip-grid" },
    ...items.map(item => {
      const on = selected === item.id;
      const cls = "chip" + (on ? " active" : "") + (extraClass ? " " + extraClass : "");
      const b = el("button", { className: cls, onClick: () => { onSelect(item.id); render(); } },
        (item.emoji || item.icon || "") + " " + item.label
      );
      // Special spice coloring
      if (on && item.color) {
        b.style.background = item.color;
        b.style.borderColor = item.color;
      }
      return b;
    })
  );
}

function timeChips(selected, onSelect) {
  return el("div", { className: "chip-grid" },
    ...TIME_MODES.map(t => {
      const on = selected === t.id;
      const b = el("button", {
        className: "chip chip-time" + (on ? " active" : ""),
        onClick: () => { onSelect(t.id); render(); }
      },
        el("span", null, t.emoji + " " + t.label),
        el("span", { className: "sub" }, t.sub)
      );
      return b;
    })
  );
}

function numBtns(options, selected, onSelect) {
  return el("div", { className: "num-grid" },
    ...options.map(n =>
      el("button", {
        className: "num-btn" + (selected === n ? " active" : ""),
        onClick: () => { onSelect(n); render(); }
      }, String(n))
    )
  );
}

// ── Collapsible Card ──
function collapsibleCard(id, title, summary, contentFn) {
  const isOpen = S.openSections.has(id);
  const card = el("div", { className: "card-section" });
  const header = el("div", { className: "card-header", onClick: () => toggleSection(id) },
    el("div", { style: { display: "flex", alignItems: "center" } },
      el("h3", null, title),
      summary ? el("span", { className: "summary" }, summary) : null
    ),
    el("span", { className: "arrow" + (isOpen ? " open" : "") }, "▾")
  );
  card.appendChild(header);
  if (isOpen) {
    const body = el("div", { className: "card-body with-top-border" });
    body.appendChild(contentFn());
    card.appendChild(body);
  }
  return card;
}

// ── Prompt ──
function buildPrompt() {
  const ingList = S.ingredients.map(i => i.qty ? `${i.name} (${i.qty})` : i.name).join(", ");
  const pantryList = S.pantryOn ? [...S.pantrySet].join(", ") : "";
  const cuisinePref = S.cuisine === "any" ? "any world cuisine — be creative and diverse" : CUISINES.find(c=>c.id===S.cuisine)?.label + " cuisine";
  const dietPref = S.diet === "none" ? "" : "Dietary restriction: " + DIETS.find(d=>d.id===S.diet)?.label + ". MUST comply strictly.";
  const timePref = TIME_MODES.find(t=>t.id===S.timeMode);
  const spicePref = SPICE_LEVELS.find(s=>s.id===S.spice);
  const skillPref = SKILL_LEVELS.find(s=>s.id===S.skill);
  const mealPref = S.mealType === "any" ? "" : "Meal type: " + MEAL_TYPES.find(m=>m.id===S.mealType)?.label;
  const fitPref = S.fitnessGoal === "none" ? "" : "Fitness goal: " + FITNESS_GOALS.find(f=>f.id===S.fitnessGoal)?.label + " — optimize macros";

  return `You are a world-class chef and sports nutritionist helping reduce food waste.

INGREDIENTS: ${ingList}
${pantryList ? "PANTRY STAPLES: " + pantryList : "NO pantry staples."}

PREFERENCES:
- Cuisine: ${cuisinePref}
- Time: ${timePref.label} (${timePref.sub})
- Spice: ${spicePref.label}
- Skill: ${skillPref.label}
- Servings: ${S.servings}
${mealPref ? "- " + mealPref : ""}
${dietPref ? "- " + dietPref : ""}
${fitPref ? "- " + fitPref : ""}
- Recipes: ${S.count}

RULES: Maximize ingredient use. Match time/skill/spice. Include nutrition per serving. List missing_items if 1-2 extras needed.

Respond ONLY with valid JSON, no markdown:
{"recipes":[{"name":"Name","emoji":"🍛","cuisine":"Origin","difficulty":"Easy|Medium|Hard","time":"25 mins","servings":"${S.servings}","coverage":85,"spice_level":"medium","nutrition":{"calories":350,"protein":25,"carbs":40,"fat":12,"fiber":6},"ingredients":[{"amount":"200g","item":"potatoes, diced"}],"steps":["Step."],"tips":"Tip","missing_items":["item"]}],"waste_score":{"score":82,"summary":"Explanation"}}`;
}

// ── API Call ──
async function findRecipes() {
  if (!S.ingredients.length || !S.apiKey) {
    if (!S.apiKey) { S.showSettings = true; render(); }
    return;
  }
  S.loading = true; S.error = null; S.recipes = null; S.wasteScore = null;
  S.openRecipes = new Set([0]);
  render();

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + S.apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt() }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error?.message || `API error: ${res.status}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    S.recipes = parsed.recipes || [];
    if (parsed.waste_score) S.wasteScore = parsed.waste_score;
  } catch(err) {
    console.error(err);
    S.error = err.message || "Something went wrong. Please try again!";
  }
  S.loading = false;
  render();
  setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
}

// ── Recipe text for copy ──
function recipeText(r) {
  let t = `${r.emoji||"🍽️"} ${r.name}\n${r.cuisine} · ${r.difficulty} · ${r.time}\nServes ${r.servings||"2"}\n\n`;
  t += "INGREDIENTS:\n" + (r.ingredients||[]).map(i => `• ${i.amount} ${i.item}`).join("\n") + "\n\n";
  t += "METHOD:\n" + (r.steps||[]).map((s,i) => `${i+1}. ${s}`).join("\n") + "\n";
  if (r.tips) t += `\n💡 ${r.tips}\n`;
  if (r.nutrition) t += `\nNutrition/serving: ${r.nutrition.calories}cal · P:${r.nutrition.protein}g · C:${r.nutrition.carbs}g · F:${r.nutrition.fat}g`;
  return t;
}

// ══════════════════════
// RENDER
// ══════════════════════
function render() {
  document.body.className = S.isDark ? "dark" : "";
  const app = document.getElementById("app");
  app.innerHTML = "";

  // ── Header ──
  const header = el("div", { className: "header" },
    S.savedRecipes.length > 0 ? el("button", {
      className: "header-btn left",
      onClick: () => { S.showSaved = !S.showSaved; render(); }
    }, "💾 " + S.savedRecipes.length) : null,
    el("button", {
      className: "header-btn right",
      onClick: () => { S.isDark = !S.isDark; saveDark(); render(); }
    }, S.isDark ? "☀️" : "🌙"),
    el("div", { className: "header-icon" }, "🥘"),
    el("h1", null, "Zero Waste Kitchen"),
    el("p", null, "Turn your leftovers into world-class meals"),
    el("button", {
      className: "api-banner" + (S.apiKey ? " api-ok" : ""),
      onClick: () => { S.showSettings = true; render(); }
    }, S.apiKey ? "✅ Gemini API connected" : "⚠️ Add your Gemini API key to get started")
  );
  app.appendChild(header);

  const container = el("div", { className: "container" });
  app.appendChild(container);

  // ── Saved Recipes Panel ──
  if (S.showSaved && S.savedRecipes.length > 0) {
    const saved = el("div", { className: "section" });
    saved.appendChild(el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
      el("h3", { className: "section-title", style: { margin: 0 } }, "💾 Saved Recipes"),
      el("button", { className: "action-btn", onClick: () => { S.showSaved = false; render(); } }, "Hide")
    ));
    S.savedRecipes.forEach((r, i) => saved.appendChild(buildRecipeCard(r, i, true)));
    container.appendChild(saved);
  }

  // ── Ingredients Section (always open) ──
  const ingSection = el("div", { className: "section" });
  ingSection.appendChild(el("div", { className: "section-title" }, "What's in your kitchen?"));

  // Input row
  const inputRow = el("div", { className: "input-row" });
  const input = el("input", {
    type: "text", placeholder: "Type an ingredient...",
    value: S.inputVal
  });
  input.addEventListener("input", e => S.inputVal = e.target.value);
  input.addEventListener("keydown", e => { if (e.key === "Enter") { addIngredient(S.inputVal); render(); } });
  inputRow.appendChild(input);
  inputRow.appendChild(el("button", { className: "add-btn", onClick: () => { addIngredient(S.inputVal); render(); } }, "+ Add"));
  ingSection.appendChild(inputRow);

  // Quick adds
  ingSection.appendChild(el("div", { className: "quick-label" }, "Quick add:"));
  const quickGrid = el("div", { className: "quick-grid" });
  QUICK_ADDS.filter(q => !S.ingredients.some(i => i.name.toLowerCase() === q.toLowerCase()))
    .slice(0, 14).forEach(q => {
      quickGrid.appendChild(el("button", { className: "quick-chip", onClick: () => { addIngredient(q); render(); } }, q));
    });
  ingSection.appendChild(quickGrid);

  // Tags
  if (S.ingredients.length > 0) {
    const tagsArea = el("div", { className: "tags-area" });
    S.ingredients.forEach((item, i) => {
      const tag = el("div", { className: "tag" });
      tag.appendChild(el("span", null, item.name));
      if (S.editingQty === i) {
        const qtyInput = el("input", { type: "text", value: item.qty || "", placeholder: "e.g. 200g" });
        qtyInput.addEventListener("input", e => { S.ingredients[i].qty = e.target.value; });
        qtyInput.addEventListener("blur", () => { S.editingQty = null; render(); });
        qtyInput.addEventListener("keydown", e => { if (e.key === "Enter") { S.editingQty = null; render(); } });
        tag.appendChild(qtyInput);
        setTimeout(() => qtyInput.focus(), 0);
      } else {
        tag.appendChild(el("button", {
          className: "tag-qty-btn" + (item.qty ? " has-qty" : ""),
          onClick: () => { S.editingQty = i; render(); }
        }, item.qty || "+ qty"));
      }
      tag.appendChild(el("button", { className: "tag-remove", onClick: () => { S.ingredients.splice(i, 1); render(); } }, "×"));
      tagsArea.appendChild(tag);
    });
    tagsArea.appendChild(el("button", { className: "clear-btn", onClick: () => { S.ingredients = []; render(); } }, "Clear all"));
    ingSection.appendChild(tagsArea);
  }
  container.appendChild(ingSection);

  // ── Pantry Staples (collapsible card) ──
  container.appendChild(collapsibleCard("pantry", "🧂 Pantry Staples",
    S.pantryOn ? [...S.pantrySet].length + " items" : "Off",
    () => {
      const wrap = el("div", null);
      // Toggle row
      const row = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: S.pantryOn ? 16 : 0 } });
      row.appendChild(el("span", { style: { fontSize: "13.5px", color: "var(--muted)" } },
        S.pantryOn ? "Recipes will assume these basics" : "Only your listed ingredients will be used"
      ));
      const toggle = el("button", {
        className: "toggle" + (S.pantryOn ? " on" : ""),
        onClick: () => { S.pantryOn = !S.pantryOn; render(); }
      }, el("div", { className: "toggle-knob" }));
      row.appendChild(toggle);
      wrap.appendChild(row);
      if (S.pantryOn) {
        const grid = el("div", { className: "chip-grid" });
        PANTRY.forEach(p => {
          const on = S.pantrySet.has(p);
          grid.appendChild(el("button", {
            className: "chip" + (on ? " active" : ""),
            onClick: () => { if (S.pantrySet.has(p)) S.pantrySet.delete(p); else S.pantrySet.add(p); render(); }
          }, p));
        });
        wrap.appendChild(grid);
      }
      return wrap;
    }
  ));

  // ── Preferences (collapsible) ──
  const prefsLabel = [
    TIME_MODES.find(t=>t.id===S.timeMode)?.emoji + " " + TIME_MODES.find(t=>t.id===S.timeMode)?.label,
    CUISINES.find(c=>c.id===S.cuisine)?.emoji,
    SPICE_LEVELS.find(s=>s.id===S.spice)?.emoji,
    S.servings + " servings"
  ].join("  ·  ");

  container.appendChild(collapsibleCard("preferences", "⚙️ Cooking Preferences", prefsLabel, () => {
    const wrap = el("div", null);

    // Time
    wrap.appendChild(el("div", { className: "section-title", style: { marginTop: 0 } }, "⏱ Cooking Time"));
    wrap.appendChild(timeChips(S.timeMode, v => S.timeMode = v));

    // Meal Type
    wrap.appendChild(el("div", { className: "section-title", style: { marginTop: 24 } }, "🥗 Meal Type"));
    wrap.appendChild(chips(MEAL_TYPES, S.mealType, v => S.mealType = v));

    // Cuisine
    wrap.appendChild(el("div", { className: "section-title", style: { marginTop: 24 } }, "🌍 Cuisine"));
    wrap.appendChild(chips(CUISINES, S.cuisine, v => S.cuisine = v));

    // Diet
    wrap.appendChild(el("div", { className: "section-title", style: { marginTop: 24 } }, "🥬 Dietary Filter"));
    wrap.appendChild(chips(DIETS, S.diet, v => S.diet = v));

    // Fitness
    wrap.appendChild(el("div", { className: "section-title", style: { marginTop: 24 } }, "💪 Fitness Goal"));
    wrap.appendChild(chips(FITNESS_GOALS, S.fitnessGoal, v => S.fitnessGoal = v));

    // Spice + Skill side by side
    const twoCol = el("div", { className: "two-col", style: { marginTop: 24 } });
    const leftCol = el("div", null,
      el("div", { className: "section-title" }, "🌶️ Spice Level"),
      chips(SPICE_LEVELS, S.spice, v => S.spice = v)
    );
    const rightCol = el("div", null,
      el("div", { className: "section-title" }, "🧑‍🍳 Skill Level"),
      chips(SKILL_LEVELS, S.skill, v => S.skill = v)
    );
    twoCol.appendChild(leftCol);
    twoCol.appendChild(rightCol);
    wrap.appendChild(twoCol);

    // Servings + Count
    const twoCol2 = el("div", { className: "two-col", style: { marginTop: 24 } });
    twoCol2.appendChild(el("div", null,
      el("div", { className: "section-title" }, "🍽️ Servings"),
      numBtns([1, 2, 4, 6], S.servings, v => S.servings = v)
    ));
    twoCol2.appendChild(el("div", null,
      el("div", { className: "section-title" }, "📋 Recipes"),
      numBtns([1, 2, 3, 4, 5], S.count, v => S.count = v)
    ));
    wrap.appendChild(twoCol2);

    return wrap;
  }));

  // ── Generate Button ──
  const canGen = S.ingredients.length > 0 && !S.loading && S.apiKey;
  const genBtn = el("button", {
    className: "gen-btn",
    onClick: () => {
      if (!S.apiKey) { S.showSettings = true; render(); return; }
      if (S.ingredients.length > 0) findRecipes();
    }
  }, S.loading ? "🍳 Cooking..." : S.ingredients.length === 0 ? "Add ingredients to get started" : !S.apiKey ? "🔑 Set API key first" : `🍳 Find ${S.count} Recipe${S.count > 1 ? "s" : ""}`);
  if (!canGen) {
    genBtn.disabled = true;
    genBtn.style.opacity = "0.5";
  }
  container.appendChild(genBtn);

  // ── Loading ──
  if (S.loading) {
    container.appendChild(el("div", { className: "loading" },
      el("div", { className: "icon" }, "🍳"),
      el("h3", null, "Chef is thinking..."),
      el("p", null, "Finding perfect recipes for your ingredients"),
      el("div", { className: "loading-dots" },
        el("div", { className: "loading-dot" }),
        el("div", { className: "loading-dot" }),
        el("div", { className: "loading-dot" })
      )
    ));
  }

  // ── Error ──
  if (S.error) {
    container.appendChild(el("div", { className: "error-msg" }, S.error));
  }

  // ── Results ──
  const results = el("div", { id: "results" });

  if (S.wasteScore) {
    const ws = el("div", { className: "waste-score" },
      el("div", { style: { fontSize: "13px", color: "var(--muted)" } }, "♻️ Overall Waste Efficiency"),
      el("div", { className: "number", style: { color: S.wasteScore.score >= 70 ? "var(--success)" : "#C87F2E" } }, S.wasteScore.score + "%"),
      el("div", { className: "waste-bar" },
        el("div", { className: "waste-bar-fill", style: { width: S.wasteScore.score + "%" } })
      ),
      el("div", { style: { fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.5" } }, S.wasteScore.summary)
    );
    results.appendChild(ws);
  }

  if (S.recipes && S.recipes.length > 0) {
    results.appendChild(el("div", { className: "results-header" },
      el("h2", { className: "results-title" }, "Your Recipes ✨"),
      el("button", { className: "action-btn", onClick: findRecipes }, "🔄 New")
    ));
    S.recipes.forEach((r, i) => results.appendChild(buildRecipeCard(r, i, false)));
  }

  if (S.recipes && S.recipes.length === 0) {
    results.appendChild(el("div", { style: { padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: "14px" } },
      el("div", { style: { fontSize: "42px", marginBottom: "12px" } }, "🤔"),
      "No recipes found — try different ingredients or cuisine."
    ));
  }

  container.appendChild(results);

  // Footer
  container.appendChild(el("div", { className: "footer" }, "Made with 🤎 to reduce food waste · Powered by Gemini AI"));

  // ── Toast ──
  if (S.toast) {
    app.appendChild(el("div", { className: "toast" }, S.toast));
  }

  // ── Settings Modal ──
  if (S.showSettings) {
    const overlay = el("div", { className: "modal-overlay" },
      el("div", { className: "modal-backdrop", onClick: () => { S.showSettings = false; render(); } }),
      el("div", { className: "modal-panel" },
        el("h3", null, "🔑 Gemini API Key"),
        el("p", null, "Get a free key from Google AI Studio. Your key is stored only on your device."),
        (() => {
          const inp = el("input", { type: "password", placeholder: "Paste your API key here...", value: S.apiKey });
          inp.addEventListener("input", e => S.apiKey = e.target.value);
          return inp;
        })(),
        el("p", { style: { fontSize: "12px", marginBottom: "16px" } },
          el("a", { href: "https://aistudio.google.com/apikey", target: "_blank", style: { color: "var(--accent)" } }, "→ Get free API key from Google AI Studio")
        ),
        el("div", { className: "modal-btns" },
          el("button", { className: "modal-cancel", onClick: () => { S.showSettings = false; render(); } }, "Cancel"),
          el("button", { className: "modal-save", onClick: () => { saveKey(); S.showSettings = false; render(); toast("API key saved!"); } }, "Save")
        )
      )
    );
    app.appendChild(overlay);
  }
}

// ── Build Recipe Card ──
function buildRecipeCard(recipe, index, isSavedView) {
  const isOpen = isSavedView || S.openRecipes.has(index);
  const card = el("div", { className: "recipe-card", style: { animationDelay: (index * 0.1) + "s", animation: "fadeUp 0.5s ease both" } });

  // Header
  const diffColors = { Easy: "var(--success)", Medium: "#C87F2E", Hard: "var(--danger)" };
  const headerBtn = el("button", {
    className: "recipe-header" + (isOpen ? " open" : ""),
    onClick: () => {
      if (!isSavedView) {
        if (S.openRecipes.has(index)) S.openRecipes.delete(index);
        else S.openRecipes.add(index);
        render();
      }
    }
  });

  const topRow = el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "start", width: "100%" } });
  const info = el("div", { style: { flex: 1 } },
    el("div", { className: "recipe-name" }, (recipe.emoji || "🍽️") + " " + recipe.name),
    el("div", { className: "recipe-meta" },
      el("span", null, recipe.cuisine),
      el("span", { className: "recipe-badge", style: { background: (diffColors[recipe.difficulty] || "var(--muted)") + "18", color: diffColors[recipe.difficulty] || "var(--muted)" } }, recipe.difficulty),
      el("span", null, "⏱ " + recipe.time),
      recipe.servings ? el("span", null, "🍽️ " + recipe.servings) : null
    )
  );
  topRow.appendChild(info);
  if (!isSavedView) {
    topRow.appendChild(el("span", {
      style: { fontSize: "18px", color: "var(--muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s", flexShrink: 0, marginLeft: "10px" }
    }, "▾"));
  }
  headerBtn.appendChild(topRow);

  // Coverage bar
  if (recipe.coverage != null) {
    const cov = el("div", { className: "coverage-row" },
      el("div", { className: "coverage-labels" },
        el("span", null, "Ingredient coverage"),
        el("span", { style: { fontWeight: 600, color: "var(--success)" } }, recipe.coverage + "%")
      ),
      el("div", { className: "coverage-bar" },
        el("div", { className: "coverage-fill", style: { width: recipe.coverage + "%" } })
      )
    );
    headerBtn.appendChild(cov);
  }
  card.appendChild(headerBtn);

  // Body
  if (isOpen) {
    const body = el("div", { className: "recipe-body" });
    const inner = el("div", { className: "recipe-divider" });

    // Macros
    if (recipe.nutrition) {
      const macros = [
        { label: "Calories", val: recipe.nutrition.calories, unit: "kcal", max: 800, color: "#E8944A" },
        { label: "Protein", val: recipe.nutrition.protein, unit: "g", max: 60, color: "#5A7247" },
        { label: "Carbs", val: recipe.nutrition.carbs, unit: "g", max: 100, color: "#CC8844" },
        { label: "Fat", val: recipe.nutrition.fat, unit: "g", max: 50, color: "#B5651D" },
      ];
      if (recipe.nutrition.fiber != null) macros.push({ label: "Fiber", val: recipe.nutrition.fiber, unit: "g", max: 30, color: "#6B8E23" });

      const grid = el("div", { className: "macro-grid" });
      macros.forEach(m => {
        const pct = Math.min((m.val / m.max) * 100, 100);
        grid.appendChild(el("div", { className: "macro-item" },
          el("div", { className: "macro-label" }, m.label),
          el("div", { className: "macro-value" }, String(m.val), el("span", null, m.unit)),
          el("div", { className: "macro-track" },
            el("div", { className: "macro-fill", style: { width: pct + "%", background: m.color } })
          )
        ));
      });
      inner.appendChild(grid);
    }

    // Ingredients
    inner.appendChild(el("div", { className: "sub-title" }, "Ingredients"));
    const ingList = el("div", { className: "ingredients-list" });
    (recipe.ingredients || []).forEach(ing => {
      ingList.appendChild(el("div", { className: "ing-row" },
        el("span", { className: "ing-dot" }, "●"),
        el("span", { className: "ing-amount" }, ing.amount),
        el("span", null, ing.item)
      ));
    });
    inner.appendChild(ingList);

    // Steps
    inner.appendChild(el("div", { className: "sub-title", style: { marginTop: "20px" } }, "Method"));
    const stepsList = el("div", { className: "steps-list" });
    (recipe.steps || []).forEach((step, i) => {
      stepsList.appendChild(el("div", { className: "step" },
        el("span", { className: "step-num" }, String(i + 1)),
        el("span", null, step)
      ));
    });
    inner.appendChild(stepsList);

    // Tip
    if (recipe.tips) {
      inner.appendChild(el("div", { className: "tip-box" },
        el("span", { innerHTML: "💡 <strong>Tip:</strong> " + recipe.tips })
      ));
    }

    // Shopping nudge
    if (recipe.missing_items && recipe.missing_items.length > 0) {
      inner.appendChild(el("div", { className: "shop-box" },
        el("span", { innerHTML: "🛒 <strong>You'd only need:</strong> " + recipe.missing_items.join(", ") })
      ));
    }

    // Actions
    const isSaved = S.savedRecipes.some(s => s.name === recipe.name);
    const actions = el("div", { className: "recipe-actions" });
    actions.appendChild(el("button", {
      className: "action-btn" + (isSaved ? " saved" : ""),
      onClick: () => {
        if (isSaved) S.savedRecipes = S.savedRecipes.filter(s => s.name !== recipe.name);
        else S.savedRecipes.push(recipe);
        saveSaved(); render();
      }
    }, isSaved ? "✅ Saved" : "💾 Save"));
    actions.appendChild(el("button", {
      className: "action-btn",
      onClick: () => { navigator.clipboard?.writeText(recipeText(recipe)); toast("📋 Recipe copied!"); }
    }, "📋 Copy"));
    inner.appendChild(actions);

    body.appendChild(inner);
    card.appendChild(body);
  }
  return card;
}

function addIngredient(name) {
  const t = (name || "").trim();
  if (!t || S.ingredients.some(i => i.name.toLowerCase() === t.toLowerCase())) return;
  S.ingredients.push({ name: t, qty: "" });
  S.inputVal = "";
}

// Initial render
render();
