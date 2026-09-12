import * as THREE from "three"
import {
  createGame,
  models,
  lights,
  math,
  followCamera,
  palette,
} from "./engine/index.js"

// Initialize game world
const game = createGame({
  background: "#0d1117",
  fov: 45,
  fog: { color: "#0d1117", near: 20, far: 80 },
})

// Setup lighting — full daylight rig plus explicit ambient fill so the
// scene can never render black even if the rig defaults change.
lights.daylight(game.scene, { intensity: 2.8 })
const ambientFill = new THREE.AmbientLight(0xffffff, 0.65)
game.scene.add(ambientFill)
const dirFill = new THREE.DirectionalLight(0xffffff, 0.9)
dirFill.position.set(10, 20, 10)
game.scene.add(dirFill)

// Add terrain
const ground = models.ground(80, { color: "#1e293b", accent: "#334155" })
game.scene.add(ground)

// Add decorative low-poly trees/rocks
for (let i = 0; i < 16; i++) {
  const rock = models.rock({ radius: math.randRange(0.8, 1.8), color: "#475569" })
  const angle = (i / 16) * Math.PI * 2
  const dist = math.randRange(12, 35)
  rock.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
  game.scene.add(rock)
}

// Player character
const player = models.character({ shirt: palette.blue, skin: palette.gold ?? palette.amber })
player.position.set(0, 0, 0)
game.scene.add(player)

// Follow camera (the rig needs the engine, not the bare camera)
followCamera(game.engine, player, {
  distance: 10,
  height: 5,
  lookAhead: 2,
  stiffness: 6,
})

// Coins to collect
const coins = []
function spawnCoin() {
  const coin = models.coin({ color: palette.gold ?? palette.yellow })
  coin.position.set(math.randRange(-15, 15), 0.8, math.randRange(-15, 15))
  game.scene.add(coin)
  coins.push(coin)
}
for (let i = 0; i < 8; i++) spawnCoin()

let score = 0
let won = false

// HUD: title, live score stat and control hints.
const scoreStat = game.hud.stat("Score", 0, { at: "top-left" })
game.hud.text("THE HUMAN EXAM", { at: "top-center" })
game.hud.text("WASD / Arrows to Move • Collect all 8 coins", {
  at: "bottom-center",
})
// Compatibility helpers used by the game logic below.
game.hud.setScore = (value) => scoreStat.set(value)
game.hud.showMessage = (message) => game.hud.banner(message)

const moveSpeed = 8

// --- Robust input shim -------------------------------------------------------
// The engine's input API may not expose `vector()`; fall back to direct
// keyboard tracking so the update loop can never throw and freeze frames.
const keyState = { up: false, down: false, left: false, right: false }
const KEYMAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
}
window.addEventListener("keydown", (e) => {
  const a = KEYMAP[e.code]
  if (a) { keyState[a] = true; e.preventDefault() }
})
window.addEventListener("keyup", (e) => {
  const a = KEYMAP[e.code]
  if (a) { keyState[a] = false; e.preventDefault() }
})
window.addEventListener("blur", () => {
  keyState.up = keyState.down = keyState.left = keyState.right = false
})

// Compatibility shim: the engine's input system exposes stick/keyboard
// movement via the `input.move` Vector2 property, not an `input.vector()`
// method. Provide the method form so any call sites that expect it work,
// and always fall back safely if neither is present.
if (game.input && typeof game.input.vector !== "function") {
  game.input.vector = () => game.input.move
}

function getMoveVector() {
  const inp = game.input
  if (inp) {
    try {
      if (inp.move && typeof inp.move.x === "number" && typeof inp.move.y === "number") {
        if (Math.abs(inp.move.x) > 0.001 || Math.abs(inp.move.y) > 0.001) return inp.move
      } else if (typeof inp.vector === "function") {
        const v = inp.vector()
        if (v && typeof v.x === "number" && typeof v.y === "number") return v
      }
    } catch { /* fall through to keyboard shim */ }
  }
  const x = (keyState.right ? 1 : 0) - (keyState.left ? 1 : 0)
  const y = (keyState.up ? 1 : 0) - (keyState.down ? 1 : 0)
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len, lengthSq: () => (x * x + y * y) / (len * len) }
}

// Non-critical subsystem guards: a missing audio/engine API must never
// throw inside the render loop or UI handlers and freeze the experience.
function safePlay(name) {
  try { if (game.audio && typeof game.audio.play === "function") game.audio.play(name) } catch { /* non-critical */ }
}
function safePause() {
  try { if (game.engine && typeof game.engine.pause === "function") game.engine.pause() } catch { /* non-critical */ }
}
function safeResume() {
  try { if (game.engine && typeof game.engine.resume === "function") game.engine.resume() } catch { /* non-critical */ }
}

// Game loop
game.onUpdate((dt) => {
  const move = getMoveVector()
  if (move.lengthSq() > 0.001) {
    // The follow camera sits behind the player on +Z and looks toward -Z, so
    // screen-up is world -Z. Negate move.y: without this, W/ArrowUp walks the
    // character toward the camera (down the screen) and the model faces away
    // from its own travel direction.
    player.position.x += move.x * moveSpeed * dt
    player.position.z -= move.y * moveSpeed * dt
    player.rotation.y = Math.atan2(move.x, -move.y)
  }

  // Animate coins & check collection
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i]
    c.rotation.y += 2 * dt
    const dx = player.position.x - c.position.x
    const dz = player.position.z - c.position.z
    if (dx * dx + dz * dz < 2.0) {
      game.scene.remove(c)
      coins.splice(i, 1)
      score += 10
      game.hud.setScore(score)
      safePlay("coin")
    }
  }

  if (coins.length === 0 && !won) {
    won = true
    game.hud.showMessage("All Coins Collected! Winner!")
    safePlay("win")
    safePause()
    if (typeof window !== "undefined" && window.__GAME_BUS__) {
      window.__GAME_BUS__.emit("game-over", { score, win: true })
    }
  }
})

// --- QA / automation hooks ---------------------------------------------------
if (typeof window !== "undefined") {
  window.__GAME__ = game

  // Minimal event bus for automation and UI wiring.
  const bus = {
    listeners: {},
    on(event, fn) {
      ;(this.listeners[event] ||= []).push(fn)
      return () => this.off(event, fn)
    },
    off(event, fn) {
      this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== fn)
    },
    emit(event, payload) {
      for (const fn of this.listeners[event] || []) fn(payload)
    },
  }
  window.__GAME_BUS__ = bus

  function restart() {
    score = 0
    won = false
    game.hud.setScore(score)
    player.position.set(0, 0, 0)
    for (const c of coins) game.scene.remove(c)
    coins.length = 0
    for (let i = 0; i < 8; i++) spawnCoin()
    safeResume()
  }

  // Standard UI buttons expected by automation.
  const ui = document.createElement("div")
  ui.style.cssText =
    "position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:50;"
  const makeButton = (id, label, onClick) => {
    const b = document.createElement("button")
    b.id = id
    b.textContent = label
    b.style.cssText =
      "padding:6px 12px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#f1f5f9;cursor:pointer;font:600 12px system-ui,sans-serif;"
    b.addEventListener("click", onClick)
    ui.appendChild(b)
  }
  makeButton("btn-start", "Start", () => {
    safeResume()
    bus.emit("start")
  })
  makeButton("btn-pause", "Pause", () => {
    safePause()
    bus.emit("pause")
  })
  makeButton("btn-resume", "Resume", () => {
    safeResume()
    bus.emit("resume")
  })
  makeButton("btn-restart", "Restart", () => {
    restart()
    bus.emit("restart")
  })
  document.body.appendChild(ui)

  // Bus-driven control (automation can emit these directly).
  bus.on("start", () => {
    safeResume()
  })
  bus.on("pause", () => {
    safePause()
  })
  bus.on("resume", () => {
    safeResume()
  })
  bus.on("restart", () => {
    restart()
  })

  // Signal to QA and preview that the game is ready.
  window.__GAME_READY__ = true
}