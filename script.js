// VERSION: 2026-07-27 22:53 (+08:00)
// Sunny's Biodiversity Trail - Level 2 - script.js
// Written in ES5 only (var, function expressions, no arrow functions,
// no let/const, no template literals, no classes) for Mimo compatibility.
//
// PLACEHOLDER ART SYSTEM:
// Every image below is loaded from assets/images/ (or a hotlinked URL,
// see imageSources). If the file does not exist / fails to load, the
// game silently falls back to a drawn placeholder shape (colored box /
// circle + emoji). Once real art is in place, it's used automatically -
// no code changes needed. Same idea for sounds.

(function () {
  "use strict";

  // ---------------------------------------------------------------
  // ASSET DEFINITIONS
  // ---------------------------------------------------------------
  // Reused hotlinked art from Level 1 (same cat, same Sunny, same
  // tree/rock decorations - see README "Sourced art" note). The
  // background below is a new Level 2-specific piece, not reused.
  var imageSources = {
    catIdle: "https://i.postimg.cc/Wz93PhKz/cat-idle.png",
    catWalk1: "https://i.postimg.cc/Kj9zyRVR/cat-walk-1.png",
    catWalk2: "https://i.postimg.cc/fyHLhJFS/cat-walk-2.png",
    catHappy: "https://i.postimg.cc/QC6trHP9/cat-happy.png",
    sunny: "https://i.postimg.cc/t4Rmv7tC/friend-cat-1.png",
    tree: "https://i.postimg.cc/0y5HXrdb/tree.png",
    rock: "https://i.postimg.cc/vZ8S2DL1/rock.png",

    // New Level 2-specific background (biodiversity trail themed, not
    // the reused Level 1 forest backdrop).
    background: "https://i.postimg.cc/XJLXjfrH/forest-background-2.png",

    // Bird pair, card pair, garden pair, and badge - all sourced and
    // hotlinked (same pattern as the Level 1 art above). Every image
    // for Level 2 is now sourced; nothing left drawing as a
    // placeholder shape.
    birdLost: "https://i.postimg.cc/8PymCW8Q/bird-lost.png",
    birdNest: "https://i.postimg.cc/vHPtm9Rd/bird-nest.png",
    cardsUnsorted: "https://i.postimg.cc/4N8Q3tCg/cards-unsorted.png",
    cardsSorted: "https://i.postimg.cc/YqXzSgc7/cards-sorted.png",
    gardenEmpty: "https://i.postimg.cc/pTCyWfmZ/garden-empty.png",
    gardenBloom: "https://i.postimg.cc/PxyNXWCK/garden-bloom.png",
    natureBadge: "https://i.postimg.cc/HssvkdhP/nature-badge.png"
  };

  var soundSources = {
    music: "assets/sounds/music.mp3",
    jump: "assets/sounds/jump.mp3",
    collect: "assets/sounds/collect.mp3",
    correct: "assets/sounds/correct.mp3",
    rescue: "assets/sounds/rescue.mp3",
    wrong: "assets/sounds/wrong.mp3"
  };

  var images = {};
  var imageLoaded = {};

  function loadImages() {
    var key;
    for (key in imageSources) {
      if (imageSources.hasOwnProperty(key)) {
        (function (k) {
          var img = new Image();
          imageLoaded[k] = false;
          img.onload = function () {
            imageLoaded[k] = true;
          };
          img.onerror = function () {
            imageLoaded[k] = false;
          };
          img.src = imageSources[k];
          images[k] = img;
        })(key);
      }
    }
  }

  var sounds = {};
  function loadSounds() {
    var key;
    for (key in soundSources) {
      if (soundSources.hasOwnProperty(key)) {
        var audio = new Audio();
        audio.src = soundSources[key];
        sounds[key] = audio;
      }
    }
  }

  // Web Audio fallback beep - used whenever a real sound file
  // has not been added yet, so testing still feels responsive.
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
      }
    }
    return audioCtx;
  }

  function beep(freq, durationMs) {
    var ctx = getAudioCtx();
    if (!ctx) {
      return;
    }
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      // ignore
    }
  }

  var beepFreqs = {
    jump: 520,
    collect: 700,
    correct: 880,
    rescue: 1040,
    wrong: 180
  };

  var soundOn = true;

  function playSound(name) {
    if (!soundOn) {
      return;
    }
    var audio = sounds[name];
    if (audio && audio.src) {
      // try the real file first
      var clone = audio.cloneNode(true);
      var playedPromise = clone.play();
      if (playedPromise && playedPromise.catch) {
        playedPromise.catch(function () {
          beep(beepFreqs[name] || 440, 180);
        });
      }
    } else {
      beep(beepFreqs[name] || 440, 180);
    }
  }

  function playMusic() {
    if (!soundOn) {
      return;
    }
    var music = sounds.music;
    if (music) {
      music.loop = true;
      music.volume = 0.4;
      var p = music.play();
      if (p && p.catch) {
        p.catch(function () {
          // no music file yet - silently skip, no beep loop needed
        });
      }
    }
  }

  function stopMusic() {
    var music = sounds.music;
    if (music) {
      music.pause();
      music.currentTime = 0;
    }
  }

  // ---------------------------------------------------------------
  // DOM REFS
  // ---------------------------------------------------------------
  var startScreen = document.getElementById("start-screen");
  var gameScreen = document.getElementById("game-screen");
  var completeScreen = document.getElementById("complete-screen");
  var gameoverScreen = document.getElementById("gameover-screen");

  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");

  var progressCount = document.getElementById("progress-count");
  var restartOverlay = document.getElementById("restart-overlay");
  var puzzleOverlay = document.getElementById("puzzle-overlay");
  var puzzleTitle = document.getElementById("puzzle-title");
  var puzzleInstructions = document.getElementById("puzzle-instructions");
  var puzzleOptions = document.getElementById("puzzle-options");
  var puzzleFeedback = document.getElementById("puzzle-feedback");

  var playBtn = document.getElementById("play-btn");
  var playAgainBtn = document.getElementById("play-again-btn");
  var tryAgainBtn = document.getElementById("try-again-btn");
  var leftBtn = document.getElementById("left-btn");
  var rightBtn = document.getElementById("right-btn");
  var jumpBtn = document.getElementById("jump-btn");
  var soundBtn = document.getElementById("sound-btn");
  var restartBtn = document.getElementById("restart-btn");
  var confirmRestartBtn = document.getElementById("confirm-restart-btn");
  var cancelRestartBtn = document.getElementById("cancel-restart-btn");
  var infoOverlay = document.getElementById("info-overlay");
  var infoName = document.getElementById("info-name");
  var infoMessage = document.getElementById("info-message");
  var infoOkBtn = document.getElementById("info-ok-btn");

  // ---------------------------------------------------------------
  // WORLD / PHYSICS CONSTANTS (unchanged from Level 1)
  // ---------------------------------------------------------------
  var CANVAS_W = window.innerWidth;
  var CANVAS_H = window.innerHeight;
  var GROUND_RATIO = 0.80;
  var GROUND_Y = Math.round(CANVAS_H * GROUND_RATIO);
  // Fraction of the way down the *background image itself* (not the
  // canvas) where its drawn dirt path sits, measured from the actual
  // art. Used by drawBackground() to keep the visible path lined up
  // with GROUND_Y in every orientation. Update this if the background
  // image is ever swapped for art with the path in a different spot.
  var BACKGROUND_PATH_FRAC = 0.76;
  var LEVEL_WIDTH = Math.max(Math.round(CANVAS_W * 3.0), 1300);

  var BASE_CAT_SIZE = 64;
  var CAT_SIZE = clampSize(Math.round(CANVAS_H * 0.15), 70, 160);
  var FRIEND_SIZE = Math.round(CAT_SIZE * 0.85);
  var POINT_SIZE = Math.round(CAT_SIZE * 0.9); // nature question point objects
  var SCALE = CAT_SIZE / BASE_CAT_SIZE;

  var GRAVITY = 0.6 * SCALE;
  var WALK_SPEED = 1.25 * SCALE;
  var JUMP_VELOCITY = -12 * SCALE;

  function clampSize(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    if (dpr > 2) { dpr = 2; }
    var cssW = window.innerWidth;
    var cssH = window.innerHeight;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    CANVAS_W = cssW;
    CANVAS_H = cssH;
    GROUND_Y = Math.round(CANVAS_H * GROUND_RATIO);
    LEVEL_WIDTH = Math.max(Math.round(CANVAS_W * 3.0), 1300);

    CAT_SIZE = clampSize(Math.round(CANVAS_H * 0.15), 70, 160);
    FRIEND_SIZE = Math.round(CAT_SIZE * 0.85);
    POINT_SIZE = Math.round(CAT_SIZE * 0.9);
    SCALE = CAT_SIZE / BASE_CAT_SIZE;
    GRAVITY = 0.6 * SCALE;
    WALK_SPEED = 1.25 * SCALE;
    JUMP_VELOCITY = -12 * SCALE;
  }

  function repositionForResize() {
    var i;
    cat.w = CAT_SIZE;
    cat.h = CAT_SIZE;

    sunny.w = FRIEND_SIZE;
    sunny.h = FRIEND_SIZE;
    sunny.x = Math.round(sunny.xFrac * LEVEL_WIDTH);
    sunny.y = GROUND_Y - sunny.h;

    for (i = 0; i < points.length; i++) {
      points[i].w = POINT_SIZE;
      points[i].h = POINT_SIZE;
      points[i].x = Math.round(points[i].xFrac * LEVEL_WIDTH);
      points[i].y = GROUND_Y - points[i].h;
    }

    for (i = 0; i < decorations.length; i++) {
      decorations[i].x = Math.round(decorations[i].xFrac * LEVEL_WIDTH);
      decorations[i].y = GROUND_Y - decorations[i].h;
    }

    badge.w = Math.round(CAT_SIZE * 0.5);
    badge.h = badge.w;

    if (cat.x + cat.w > LEVEL_WIDTH) { cat.x = LEVEL_WIDTH - cat.w; }
    if (cat.onGround) { cat.y = GROUND_Y - cat.h; }
  }

  function handleResize() {
    resizeCanvas();
    repositionForResize();
  }

  // ---------------------------------------------------------------
  // GAME STATE
  // ---------------------------------------------------------------
  var cat = {
    x: 40,
    y: GROUND_Y - CAT_SIZE,
    w: CAT_SIZE,
    h: CAT_SIZE,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    state: "idle", // idle | walk | happy
    walkFrame: 0,
    walkTimer: 0
  };

  var camera = { x: 0 };

  // Sunny - recruited near the start of the trail, then follows Newton
  // for the rest of the level (same "follower" idea as Level 1's
  // rescued friends, just a single companion here).
  var sunny = {
    id: "sunny",
    xFrac: 0.18,
    x: 0, y: 0, w: 0, h: 0,
    recruited: false,
    awaitingClear: false,
    imgKey: "sunny",
    color: "#f6c453",
    taskId: "livingThings",
    name: "Sunny",
    intro: "Hi, Newton! There are so many things in nature. Can you help me find the living things?",
    declineName: "Sunny",
    declineMsg: "Okay! Come back when you're ready."
  };

  // The three optional nature discovery points along the trail. Each is
  // a non-solid trigger: Newton can walk straight through without
  // answering, and the intro bubble reappears if he leaves and comes
  // back to an unsolved one.
  var points = [
    {
      id: "bird",
      xFrac: 0.40,
      x: 0, y: 0, w: 0, h: 0,
      completed: false,
      awaitingClear: false,
      imgKeyBefore: "birdLost",
      imgKeyAfter: "birdNest",
      // The trigger/hitbox stays at ground level (Newton just walks up
      // to her, no jumping needed), but once solved the nest sprite
      // itself draws raised up as if perched on a branch, so it doesn't
      // contradict "birds nest in trees". 0 = no raise (ground-sitting
      // objects like cards/garden), fraction of the sprite's own
      // height for ones that should visually float up once solved.
      raiseAfterFrac: 0.7,
      // The sourced bird-lost.png art has a visible gap between the
      // bird and the bottom edge of its own image (measured from an
      // in-game screenshot: the bird's feet sat ~40% of its own
      // sprite height above the road). This nudges the "before" sprite
      // down by that much to compensate, without moving the actual
      // hitbox used for triggering. Only applies pre-solve; the
      // raised "after" nest doesn't need it (deliberately floating).
      groundOffsetFrac: 0.35,
      placeholderEmoji: "\uD83D\uDC26",
      color: "#8fd3a0",
      taskId: "birdHabitat",
      speakerName: "Newton",
      intro: "This bird cannot find her home. Do you want to help her?",
      declineName: "Newton",
      declineMsg: "Okay! We can help her later."
    },
    {
      id: "foodchain",
      xFrac: 0.62,
      x: 0, y: 0, w: 0, h: 0,
      completed: false,
      awaitingClear: false,
      imgKeyBefore: "cardsUnsorted",
      imgKeyAfter: "cardsSorted",
      placeholderEmoji: "\uD83C\uDCCF",
      color: "#c58bf2",
      taskId: "foodChain",
      speakerName: "Newton",
      intro: "These forest cards are mixed up. Do you want to put them in order?",
      declineName: "Newton",
      declineMsg: "That's okay! We can solve it later."
    },
    {
      id: "pollinator",
      xFrac: 0.84,
      x: 0, y: 0, w: 0, h: 0,
      completed: false,
      awaitingClear: false,
      imgKeyBefore: "gardenEmpty",
      imgKeyAfter: "gardenBloom",
      placeholderEmoji: "\uD83C\uDF3C",
      color: "#7ec8e3",
      taskId: "pollinators",
      speakerName: "Newton",
      intro: "These flowers need visiting animals. Do you want to find the pollinators?",
      declineName: "Newton",
      declineMsg: "Okay! We can investigate later."
    }
  ];

  var pointsCompletedCount = 0;
  var isRunning = false;
  var loopRunning = false;
  var moveLeftHeld = false;
  var moveRightHeld = false;
  var currentPuzzle = null; // holds sunny OR a point object while its intro/puzzle is open

  var decorations = [];

  // Floating "finish" badge - spawns above wherever Newton happens to
  // be standing the moment the last discovery (Sunny + all 3 trail
  // points) is completed, same as Level 1. Jumping into it ends the
  // level.
  var badge = {
    active: false,
    hit: false,
    awaitingLand: false,
    x: 0, y: 0, baseY: 0, w: 0, h: 0
  };
  var badgeBobTimer = 0;

  function allQuestsDone() {
    return sunny.recruited && pointsCompletedCount >= points.length;
  }

  function buildLevel() {
    resizeCanvas();

    sunny.recruited = false;
    sunny.awaitingClear = false;

    var i;
    for (i = 0; i < points.length; i++) {
      points[i].completed = false;
      points[i].awaitingClear = false;
    }
    pointsCompletedCount = 0;
    progressCount.textContent = "0";

    decorations = [];

    badge.active = false;
    badge.hit = false;
    badge.awaitingLand = false;
    badgeBobTimer = 0;

    repositionForResize();

    cat.x = 40;
    cat.y = GROUND_Y - cat.h;
    cat.vx = 0;
    cat.vy = 0;
    cat.onGround = true;
    cat.state = "idle";
    camera.x = 0;
  }

  // Spawns the badge floating above the cat's current position, using
  // the same jump-height math Level 1 used so the timing feels the
  // same: JUMP_TRIGGER_FRACTION controls how far up the jump the cat
  // must rise before the badge counts as touched.
  function showBadge() {
    var JUMP_TRIGGER_FRACTION = 0.65;
    var maxJumpHeight = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
    var restTop = GROUND_Y - cat.h;
    badge.w = Math.round(CAT_SIZE * 0.5);
    badge.h = badge.w;
    badge.x = Math.round(cat.x + cat.w / 2 - badge.w / 2);
    var badgeBottomY = restTop - (JUMP_TRIGGER_FRACTION * maxJumpHeight);
    badge.baseY = Math.round(badgeBottomY - badge.h);
    badge.y = badge.baseY;
    badge.active = true;
    badge.hit = false;
  }

  // ---------------------------------------------------------------
  // SCREEN MANAGEMENT
  // ---------------------------------------------------------------
  function showScreen(el) {
    startScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    completeScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    el.classList.remove("hidden");
  }

  function startGame() {
    buildLevel();
    showScreen(gameScreen);
    isRunning = true;
    restartOverlay.classList.add("hidden");
    puzzleOverlay.classList.add("hidden");
    infoOverlay.classList.add("hidden");
    playMusic();
    if (!loopRunning) {
      loopRunning = true;
      requestAnimationFrame(gameLoop);
    }
  }

  function goToStart() {
    stopMusic();
    isRunning = false;
    showScreen(startScreen);
  }

  function winLevel() {
    isRunning = false;
    stopMusic();
    showScreen(completeScreen);
  }

  function loseGame() {
    isRunning = false;
    stopMusic();
    showScreen(gameoverScreen);
  }

  // ---------------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------------
  function bindHold(btn, onDown, onUp) {
    btn.addEventListener("mousedown", onDown);
    btn.addEventListener("mouseup", onUp);
    btn.addEventListener("mouseleave", onUp);
    btn.addEventListener("touchstart", function (e) {
      e.preventDefault();
      onDown();
    });
    btn.addEventListener("touchend", function (e) {
      e.preventDefault();
      onUp();
    });
  }

  bindHold(leftBtn, function () { moveLeftHeld = true; }, function () { moveLeftHeld = false; });
  bindHold(rightBtn, function () { moveRightHeld = true; }, function () { moveRightHeld = false; });

  jumpBtn.addEventListener("click", function () {
    doJump();
  });

  document.addEventListener("keydown", function (e) {
    if (!isRunning || currentPuzzle) {
      return;
    }
    if (e.key === "ArrowLeft") { moveLeftHeld = true; }
    if (e.key === "ArrowRight") { moveRightHeld = true; }
    if (e.key === " " || e.key === "ArrowUp") { doJump(); }
  });
  document.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft") { moveLeftHeld = false; }
    if (e.key === "ArrowRight") { moveRightHeld = false; }
  });

  function doJump() {
    if (!isRunning || currentPuzzle) {
      return;
    }
    if (cat.onGround) {
      cat.vy = JUMP_VELOCITY;
      cat.onGround = false;
      playSound("jump");
    }
  }

  resizeCanvas();
  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  playBtn.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", goToStart);
  tryAgainBtn.addEventListener("click", startGame);

  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "\uD83D\uDD0A" : "\uD83D\uDD07";
    if (!soundOn) {
      stopMusic();
    } else if (isRunning) {
      playMusic();
    }
  });

  restartBtn.addEventListener("click", function () {
    if (!isRunning || currentPuzzle) {
      return;
    }
    restartOverlay.classList.remove("hidden");
  });

  cancelRestartBtn.addEventListener("click", function () {
    restartOverlay.classList.add("hidden");
  });

  confirmRestartBtn.addEventListener("click", function () {
    restartOverlay.classList.add("hidden");
    startGame();
  });

  // ---------------------------------------------------------------
  // PUZZLES
  // ---------------------------------------------------------------
  // mode: "multiselect" (tap N correct out of a set), "single" (tap the
  // one correct answer), or "order" (tap items in the right sequence).
  var puzzleDefs = {
    livingThings: {
      title: "Living Things",
      instructions: "Tap the 3 living things.",
      mode: "multiselect",
      items: [
        { key: "tree", emoji: "\uD83C\uDF33", correct: true },
        { key: "bird", emoji: "\uD83D\uDC26", correct: true },
        { key: "mushroom", emoji: "\uD83C\uDF44", correct: true },
        { key: "rock", emoji: "\uD83E\uDEA8", correct: false },
        { key: "bucket", emoji: "\uD83E\uDEA3", correct: false }
      ],
      wrongMsg: "Not quite! Living things grow or change.",
      completeMsg: "Great job! Trees, birds and mushrooms are living things."
    },
    birdHabitat: {
      title: "The Bird's Habitat",
      instructions: "Where should this forest bird look for her nest?",
      mode: "single",
      items: [
        { key: "tree", emoji: "\uD83C\uDF33", correct: true },
        { key: "water", emoji: "\uD83C\uDF0A", correct: false },
        { key: "ice", emoji: "\uD83E\uDDCA", correct: false },
        { key: "car", emoji: "\uD83D\uDE97", correct: false },
        { key: "rock", emoji: "\uD83E\uDEA8", correct: false }
      ],
      wrongMsg: "Not quite! Look for a safe place above the ground.",
      completeMsg: "Correct! Many forest birds build nests in trees."
    },
    foodChain: {
      title: "Who Eats What?",
      instructions: "Tap the pictures from first to last.",
      mode: "order",
      items: [
        { key: "leaf", emoji: "\uD83C\uDF43", order: 1 },
        { key: "caterpillar", emoji: "\uD83D\uDC1B", order: 2 },
        { key: "bird", emoji: "\uD83D\uDC26", order: 3 }
      ],
      stepMsgs: [
        "Correct! What eats the leaf?",
        "Correct! What might eat the caterpillar?"
      ],
      wrongMsg: "Wrong order! Start with the plant.",
      completeMsg: "Great job! Living things can be connected through food."
    },
    pollinators: {
      title: "Flower Visitors",
      instructions: "Tap the 3 animals that can carry pollen between flowers.",
      mode: "multiselect",
      items: [
        { key: "bee", emoji: "\uD83D\uDC1D", correct: true },
        { key: "butterfly", emoji: "\uD83E\uDD8B", correct: true },
        { key: "beetle", emoji: "\uD83D\uDC1E", correct: true },
        { key: "fish", emoji: "\uD83D\uDC1F", correct: false },
        { key: "penguin", emoji: "\uD83D\uDC27", correct: false }
      ],
      wrongMsg: "Not quite! Look for an animal that visits flowers.",
      completeMsg: "Great job! Bees, butterflies and beetles can carry pollen."
    }
  };

  var puzzleState = null;

  var friendIntroOverlay = document.getElementById("friend-intro-overlay");
  var friendIntroName = document.getElementById("friend-intro-name");
  var friendIntroMessage = document.getElementById("friend-intro-message");
  var friendIntroYesBtn = document.getElementById("friend-intro-yes-btn");
  var friendIntroNoBtn = document.getElementById("friend-intro-no-btn");

  function showIntro(entity, speakerName, message) {
    currentPuzzle = entity; // freezes movement/collision checks (see update())
    entity.awaitingClear = true; // don't re-show the instant "No" is tapped
    friendIntroName.textContent = speakerName;
    friendIntroMessage.textContent = message;
    friendIntroOverlay.classList.remove("hidden");
  }

  friendIntroYesBtn.addEventListener("click", function () {
    var entity = currentPuzzle;
    friendIntroOverlay.classList.add("hidden");
    openPuzzle(entity);
  });

  friendIntroNoBtn.addEventListener("click", function () {
    var entity = currentPuzzle;
    friendIntroOverlay.classList.add("hidden");
    currentPuzzle = null;
    if (entity) {
      showInfo(entity.declineName || "Newton", entity.declineMsg || "Okay!");
    }
  });

  function showInfo(name, message) {
    infoName.textContent = name;
    infoMessage.textContent = message;
    infoOverlay.classList.remove("hidden");
  }

  infoOkBtn.addEventListener("click", function () {
    infoOverlay.classList.add("hidden");
  });

  function openPuzzle(entity) {
    currentPuzzle = entity;
    var def = puzzleDefs[entity.taskId];
    puzzleTitle.textContent = def.title;
    puzzleInstructions.textContent = def.instructions;
    puzzleFeedback.textContent = "";
    puzzleOptions.innerHTML = "";

    puzzleState = {
      mode: def.mode,
      correctFound: 0,
      correctNeeded: 0,
      nextOrder: 1
    };

    var i;
    var shuffled = def.items.slice();
    shuffleArray(shuffled);

    for (i = 0; i < shuffled.length; i++) {
      (function (item) {
        var btn = document.createElement("button");
        btn.className = "puzzle-option";
        btn.textContent = item.emoji;

        if (def.mode === "multiselect") {
          if (item.correct) {
            puzzleState.correctNeeded++;
          }
          btn.addEventListener("click", function () {
            if (btn.disabled) {
              return;
            }
            if (item.correct) {
              btn.classList.add("correct");
              btn.disabled = true;
              puzzleState.correctFound++;
              playSound("collect");
              puzzleFeedback.textContent = "Nice! " + puzzleState.correctFound + "/" + puzzleState.correctNeeded;
              if (puzzleState.correctFound >= puzzleState.correctNeeded) {
                completePuzzle(def);
              }
            } else {
              btn.classList.add("wrong");
              playSound("wrong");
              puzzleFeedback.textContent = def.wrongMsg;
              setTimeout(function () {
                btn.classList.remove("wrong");
              }, 400);
            }
          });
        } else if (def.mode === "single") {
          btn.addEventListener("click", function () {
            if (btn.disabled) {
              return;
            }
            if (item.correct) {
              btn.classList.add("correct");
              disableAllOptions();
              playSound("collect");
              completePuzzle(def);
            } else {
              btn.classList.add("wrong");
              playSound("wrong");
              puzzleFeedback.textContent = def.wrongMsg;
              setTimeout(function () {
                btn.classList.remove("wrong");
              }, 400);
            }
          });
        } else if (def.mode === "order") {
          btn.addEventListener("click", function () {
            if (btn.disabled) {
              return;
            }
            if (item.order === puzzleState.nextOrder) {
              btn.classList.add("correct");
              btn.disabled = true;
              playSound("collect");
              puzzleState.nextOrder++;
              if (puzzleState.nextOrder > def.items.length) {
                completePuzzle(def);
              } else {
                puzzleFeedback.textContent = def.stepMsgs[puzzleState.nextOrder - 2] || "Correct! Keep going.";
              }
            } else {
              btn.classList.add("wrong");
              playSound("wrong");
              puzzleFeedback.textContent = def.wrongMsg;
              setTimeout(function () {
                btn.classList.remove("wrong");
              }, 400);
            }
          });
        }

        puzzleOptions.appendChild(btn);
      })(shuffled[i]);
    }

    puzzleOverlay.classList.remove("hidden");
  }

  function disableAllOptions() {
    var i;
    var btns = puzzleOptions.querySelectorAll(".puzzle-option");
    for (i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
    }
  }

  function completePuzzle(def) {
    playSound("correct");
    puzzleFeedback.textContent = def.completeMsg;
    setTimeout(function () {
      resolveEntity(currentPuzzle);
      puzzleOverlay.classList.add("hidden");
      currentPuzzle = null;
    }, 900);
  }

  function resolveEntity(entity) {
    if (entity === sunny) {
      sunny.recruited = true;
      playSound("rescue");
      cat.state = "happy";
      setTimeout(function () {
        if (cat.state === "happy") {
          cat.state = "idle";
        }
      }, 700);
    } else {
      entity.completed = true;
      pointsCompletedCount++;
      progressCount.textContent = String(pointsCompletedCount);
      playSound("rescue");
      cat.state = "happy";
      setTimeout(function () {
        if (cat.state === "happy") {
          cat.state = "idle";
        }
      }, 700);
    }
    if (allQuestsDone() && !badge.active && !badge.hit) {
      setTimeout(showBadge, 800);
    }
  }

  function shuffleArray(arr) {
    var i, j, tmp;
    for (i = arr.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  // ---------------------------------------------------------------
  // UPDATE / PHYSICS
  // ---------------------------------------------------------------
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update() {
    if (currentPuzzle) {
      return;
    }
    if (!infoOverlay.classList.contains("hidden")) {
      return;
    }

    // horizontal movement
    cat.vx = 0;
    if (moveLeftHeld) {
      cat.vx = -WALK_SPEED;
      cat.facing = -1;
    }
    if (moveRightHeld) {
      cat.vx = WALK_SPEED;
      cat.facing = 1;
    }

    if (cat.vx !== 0 && cat.state !== "happy") {
      cat.state = "walk";
      cat.walkTimer++;
      if (cat.walkTimer > 8) {
        cat.walkTimer = 0;
        cat.walkFrame = cat.walkFrame === 0 ? 1 : 0;
      }
    } else if (cat.state !== "happy") {
      cat.state = "idle";
    }

    cat.x += cat.vx;
    if (cat.x < 0) { cat.x = 0; }
    if (cat.x + cat.w > LEVEL_WIDTH) { cat.x = LEVEL_WIDTH - cat.w; }

    var maxCamX = Math.max(0, LEVEL_WIDTH - CANVAS_W);
    var catCenterX = cat.x + cat.w / 2;
    camera.x = catCenterX - CANVAS_W * 0.3;
    if (camera.x < 0) { camera.x = 0; }
    if (camera.x > maxCamX) { camera.x = maxCamX; }

    // gravity
    cat.vy += GRAVITY;
    cat.y += cat.vy;
    if (cat.y + cat.h >= GROUND_Y) {
      cat.y = GROUND_Y - cat.h;
      cat.vy = 0;
      cat.onGround = true;
      if (badge.awaitingLand) {
        badge.awaitingLand = false;
        winLevel();
      }
    }

    // fell off world (safety net, not really reachable but wired for future levels)
    if (cat.y > CANVAS_H + 100) {
      loseGame();
      return;
    }

    // --- Sunny trigger (recruit) ---
    var sunnyOverlap = rectsOverlap(cat, sunny);
    if (!sunnyOverlap) {
      sunny.awaitingClear = false;
    }
    if (!sunny.recruited && !sunny.awaitingClear && sunnyOverlap) {
      var sunnyScreenLeft = sunny.x - camera.x;
      var sunnyScreenRight = sunnyScreenLeft + sunny.w;
      if (sunnyScreenLeft >= 0 && sunnyScreenRight <= CANVAS_W) {
        showIntro(sunny, sunny.name, sunny.intro);
        return;
      }
    }

    // --- Nature discovery point triggers ---
    var i;
    for (i = 0; i < points.length; i++) {
      var p = points[i];
      var overlapping = rectsOverlap(cat, p);
      if (!overlapping) {
        p.awaitingClear = false;
      }
      if (p.completed || p.awaitingClear || !overlapping) {
        continue;
      }
      var pScreenLeft = p.x - camera.x;
      var pScreenRight = pScreenLeft + p.w;
      var pFullyVisible = pScreenLeft >= 0 && pScreenRight <= CANVAS_W;
      if (pFullyVisible) {
        showIntro(p, p.speakerName, p.intro);
        return;
      }
    }

    // --- Floating finish badge: gentle bob for visibility, jumping
    // into it ends the level, but only once the cat has landed back on
    // the ground so the player sees the catch and the landing rather
    // than an instant cut to the end screen mid-air. ---
    if (badge.active && !badge.hit) {
      badgeBobTimer += 1;
      badge.y = badge.baseY + Math.sin(badgeBobTimer * 0.06) * (6 * SCALE);
      if (rectsOverlap(cat, badge)) {
        badge.hit = true;
        badge.active = false;
        badge.awaitingLand = true;
        playSound("collect");
        cat.state = "happy";
      }
    }
  }

  // ---------------------------------------------------------------
  // DRAW
  // ---------------------------------------------------------------
  function drawImageOrPlaceholder(key, x, y, w, h, placeholderFn) {
    if (imageLoaded[key] && images[key]) {
      ctx.drawImage(images[key], x, y, w, h);
    } else {
      placeholderFn();
    }
  }

  function drawBackground() {
    var grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, "#bfe6ff");
    grad.addColorStop(0.55, "#8fd3a0");
    grad.addColorStop(1, "#5fae6f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (imageLoaded.background && images.background) {
      var img = images.background;
      var iw = img.naturalWidth || 1920;
      var ih = img.naturalHeight || 1080;

      // "Cover" scaling: pick whichever scale (height-based or
      // width-based) is larger, so the image always fully covers the
      // canvas in both dimensions. Height-only scaling (the old
      // approach) left a gap on wide landscape screens - where the
      // canvas is proportionally wider than the background's 16:9
      // aspect ratio - because the height-scaled image ended up
      // narrower than the screen. In portrait this produces the exact
      // same result as before (height-based scale is always the
      // larger one there), so nothing changes for the common case.
      var scale = Math.max(CANVAS_H / ih, CANVAS_W / iw);
      var dw = iw * scale;
      var dh = ih * scale;

      var maxCamX = Math.max(0, LEVEL_WIDTH - CANVAS_W);
      var panRange = Math.max(0, dw - CANVAS_W);
      var t = maxCamX > 0 ? (camera.x / maxCamX) : 0;
      var dx = -(t * panRange);

      // Vertical placement: portrait mode has no room to shift the
      // image at all (dh === CANVAS_H, zero slack), so it's always
      // top-aligned - which naturally puts the path's top edge at
      // BACKGROUND_PATH_FRAC (76%) of the screen while Newton stands
      // at GROUND_RATIO (80%). That gap is what makes him look
      // planted solidly inside the path rather than right on its
      // edge. Landscape *does* have slack to shift within, so instead
      // of using that slack to snap the path's top edge exactly to
      // the ground line (which put characters right at the path's
      // edge - technically aligned, but a different look than
      // portrait), this targets the same fixed screen position
      // portrait always lands on (BACKGROUND_PATH_FRAC * CANVAS_H),
      // so both orientations look consistent instead of landscape
      // reading as "edge" and portrait as "inset".
      var idealDy = BACKGROUND_PATH_FRAC * (CANVAS_H - dh);
      var minDy = -(dh - CANVAS_H);
      var dy = Math.max(minDy, Math.min(0, idealDy));

      ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  function drawDecorations() {
    var i;
    for (i = 0; i < decorations.length; i++) {
      var d = decorations[i];
      if (d.type === "tree") {
        drawImageOrPlaceholder("tree", d.x, d.y, d.w, d.h, function () {
          ctx.fillStyle = "#6b4423";
          ctx.fillRect(d.x + d.w / 2 - 6, d.y + d.h * 0.5, 12, d.h * 0.5);
          ctx.fillStyle = "#2f6b3a";
          ctx.beginPath();
          ctx.arc(d.x + d.w / 2, d.y + d.h * 0.35, d.w * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (d.type === "rock") {
        drawImageOrPlaceholder("rock", d.x, d.y, d.w, d.h, function () {
          ctx.fillStyle = "#8d8d8d";
          ctx.beginPath();
          ctx.ellipse(d.x + d.w / 2, d.y + d.h / 2, d.w / 2, d.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
  }

  function drawSunny() {
    if (sunny.recruited) {
      return; // drawn as a follower instead, see drawFollower()
    }
    drawImageOrPlaceholder(sunny.imgKey, sunny.x, sunny.y, sunny.w, sunny.h, function () {
      ctx.fillStyle = sunny.color;
      ctx.beginPath();
      ctx.arc(sunny.x + sunny.w / 2, sunny.y + sunny.h / 2, sunny.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = (sunny.w * 0.6) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\uD83D\uDC31", sunny.x + sunny.w / 2, sunny.y + sunny.h / 2 + 2);
    });
  }

  function drawPoints() {
    var i;
    for (i = 0; i < points.length; i++) {
      var p = points[i];
      var key = p.completed ? p.imgKeyAfter : p.imgKeyBefore;
      // Hitbox (p.x/p.y) stays at ground level always, so Newton can
      // still walk up to trigger/replay it. These two offsets only
      // affect where the art is drawn, never the hitbox:
      // - raiseAfterFrac lifts the "solved" sprite up (e.g. a nest
      //   perched on a branch instead of sitting flat on the ground).
      // - groundOffsetFrac nudges the "unsolved" sprite down, to
      //   compensate for transparent padding baked into some sourced
      //   art that otherwise leaves a visible gap above the ground.
      var raiseFrac = (p.completed && p.raiseAfterFrac) ? p.raiseAfterFrac : 0;
      var groundOffsetFrac = (!p.completed && p.groundOffsetFrac) ? p.groundOffsetFrac : 0;
      var drawX = p.x;
      var drawY = p.y - Math.round(p.h * raiseFrac) + Math.round(p.h * groundOffsetFrac);
      drawImageOrPlaceholder(key, drawX, drawY, p.w, p.h, function () {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.completed ? 0.55 : 1;
        ctx.fillRect(drawX, drawY, p.w, p.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#33331f";
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, p.w, p.h);
        ctx.font = (p.w * 0.5) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.placeholderEmoji, drawX + p.w / 2, drawY + p.h / 2 + 2);
        if (p.completed) {
          ctx.font = (p.w * 0.35) + "px sans-serif";
          ctx.fillText("\u2705", drawX + p.w * 0.8, drawY + p.h * 0.2);
        }
      });
    }
  }

  function drawBadge() {
    if (!badge.active) {
      return;
    }
    // Gentle glow so it stands out clearly once it appears.
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#fff2b0";
    ctx.beginPath();
    ctx.arc(badge.x + badge.w / 2, badge.y + badge.h / 2, badge.w * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawImageOrPlaceholder("natureBadge", badge.x, badge.y, badge.w, badge.h, function () {
      ctx.fillStyle = "#ffd447";
      ctx.beginPath();
      ctx.arc(badge.x + badge.w / 2, badge.y + badge.h / 2, badge.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c98a1f";
      ctx.lineWidth = Math.max(2, badge.w * 0.06);
      ctx.stroke();
      ctx.font = (badge.w * 0.6) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\uD83C\uDF96", badge.x + badge.w / 2, badge.y + badge.h / 2 + 2);
    });
  }

  function drawFollower() {
    // Sunny walks a step behind Newton once recruited, mirrored so she
    // always faces the direction of travel (same idea as Level 1's
    // follower train, just a single companion here).
    if (!sunny.recruited) {
      return;
    }
    var followSpacing = cat.w * 0.75;
    var fx = cat.x - cat.facing * followSpacing;
    var fy = GROUND_Y - sunny.h;

    ctx.save();
    if (cat.facing === 1) {
      // Sunny's art is left-facing by default (opposite of Newton's
      // right-facing art), so the flip condition is inverted here.
      ctx.translate(fx + sunny.w, fy);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(fx, fy);
    }
    drawImageOrPlaceholder(sunny.imgKey, 0, 0, sunny.w, sunny.h, function () {
      ctx.fillStyle = sunny.color;
      ctx.beginPath();
      ctx.arc(sunny.w / 2, sunny.h / 2, sunny.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(sunny.w / 2, sunny.h / 2 + 2);
      if (cat.facing === 1) { ctx.scale(-1, 1); }
      ctx.font = (sunny.w * 0.6) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\uD83D\uDC31", 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  function drawCat() {
    var key = "catIdle";
    var placeholderEmoji = "\uD83D\uDC31";
    if (cat.state === "walk") {
      key = cat.walkFrame === 0 ? "catWalk1" : "catWalk2";
      placeholderEmoji = cat.walkFrame === 0 ? "\uD83D\uDC08" : "\uD83D\uDC31";
    } else if (cat.state === "happy") {
      key = "catHappy";
      placeholderEmoji = "\uD83D\uDE38";
    }

    ctx.save();
    if (cat.facing === -1) {
      ctx.translate(cat.x + cat.w, cat.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(cat.x, cat.y);
    }

    drawImageOrPlaceholder(key, 0, 0, cat.w, cat.h, function () {
      ctx.fillStyle = "#ff9f43";
      ctx.fillRect(0, 0, cat.w, cat.h);
      ctx.strokeStyle = "#cc7a1f";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, cat.w, cat.h);
      ctx.font = (cat.w * 0.6) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.save();
      ctx.translate(cat.w / 2, cat.h / 2 + 2);
      if (cat.facing === -1) { ctx.scale(-1, 1); }
      ctx.fillText(placeholderEmoji, 0, 0);
      ctx.restore();
    });

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    ctx.save();
    ctx.translate(-camera.x, 0);
    drawDecorations();
    drawSunny();
    drawPoints();
    drawBadge();
    drawFollower();
    drawCat();
    ctx.restore();
  }

  // ---------------------------------------------------------------
  // MAIN LOOP
  // ---------------------------------------------------------------
  function gameLoop() {
    if (!isRunning) {
      loopRunning = false;
      return;
    }
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // ---------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------
  loadImages();
  loadSounds();
  showScreen(startScreen);
})();
