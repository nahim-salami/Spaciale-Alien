$(document).ready(function () {
    const canvas = new fabric.Canvas("canvas", {
        height: window.innerHeight,
        width: window.innerWidth,
        selectable: false
    });

    const GameLevel = [
        { score: 0, label: 1, spawnInterval: 1200, alienSpeed: 1.4, groupChance: 0.2, fireChance: 0.01 },
        { score: 300, label: 2, spawnInterval: 1000, alienSpeed: 1.7, groupChance: 0.3, fireChance: 0.015 },
        { score: 700, label: 3, spawnInterval: 850, alienSpeed: 2.1, groupChance: 0.35, fireChance: 0.02 },
        { score: 1200, label: 4, spawnInterval: 700, alienSpeed: 2.5, groupChance: 0.45, fireChance: 0.03 }
    ];

    const GameObjImg = {
        img1: "images/gamer/img-1.png",
        img2: "images/gamer/img-2.png",
        img3: "images/gamer/img-3.png",
        img4: "images/gamer/img-4.png",
        img5: "images/gamer/img-5.png"
    };

    const Alien = [
        "images/alien/alien-1.png",
        "images/alien/alien-2.png",
        "images/alien/alien-3.png",
        "images/alien/alien-4.png",
        "images/alien/alien-5.png",
        "images/alien/alien-6.png",
        "images/alien/alien-7.png",
        "images/alien/alien-9.png",
        "images/alien/alien-10.png"
    ];

    const state = {
        running: false,
        score: 0,
        health: 100,
        level: 1,
        elapsed: 0,
        lastShot: 0,
        lastSpawn: 0,
        lastPowerup: 0,
        lastObstacle: 0
    };

    const assets = {
        background: new Image()
    };

    const controls = {
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false
    };

    const entities = {
        player: null,
        aliens: [],
        playerBullets: [],
        alienBullets: [],
        powerups: [],
        obstacles: []
    };

    let selectedShip = "img3";
    let loopInterval = null;
    let timerInterval = null;
    let canvasBackground = null;

    function resizeCanvas() {
        canvas.setHeight(window.innerHeight);
        canvas.setWidth(window.innerWidth);
        if (canvasBackground) {
            canvasBackground.scaleX = canvas.getWidth() / canvasBackground.width;
            canvasBackground.scaleY = canvas.getHeight() / canvasBackground.height;
        }
        if (entities.player) {
            keepInBounds(entities.player);
        }
        canvas.requestRenderAll();
    }

    function setGameBackgroundImage() {
        assets.background.onload = function () {
            fabric.Image.fromURL(assets.background.src, function (image) {
                canvas.setBackgroundImage(image, canvas.renderAll.bind(canvas), {
                    originX: "center",
                    originY: "center",
                    scaleX: canvas.get("width") / image.width,
                    scaleY: canvas.get("height") / image.height
                });
                image.center();
                canvasBackground = image;
            });
        };

        assets.background.src = "images/back/game-bg.png";
    }

    function updateHud() {
        $(".score-value").text(state.score);
        $(".health-value").text(state.health);
        $(".level-value").text(state.level);
    }

    function getLevelConfig() {
        let current = GameLevel[0];
        GameLevel.forEach((level) => {
            if (state.score >= level.score) {
                current = level;
            }
        });
        return current;
    }

    function keepInBounds(obj) {
        obj.set({
            left: Math.max(0, Math.min(obj.left, canvas.getWidth() - obj.getScaledWidth())),
            top: Math.max(0, Math.min(obj.top, canvas.getHeight() - obj.getScaledHeight()))
        });
    }

    function createPlayer() {
        return new Promise((resolve) => {
            fabric.Image.fromURL(GameObjImg[selectedShip], function (image) {
                image.set({
                    top: canvas.getHeight() - image.getScaledHeight() - 20,
                    left: canvas.getWidth() / 2 - image.getScaledWidth() / 2,
                    selectable: false
                });
                image.scaleToHeight(90);
                canvas.add(image);
                entities.player = image;
                resolve();
            });
        });
    }

    function createBullet(x, y, speed, color, direction = -1) {
        const bullet = new fabric.Rect({
            left: x,
            top: y,
            width: 6,
            height: 16,
            fill: color,
            selectable: false
        });
        bullet.set("data", { speed, direction });
        canvas.add(bullet);
        return bullet;
    }

    function spawnAlien(x, y, speed) {
        const alienSrc = Alien[Math.floor(Math.random() * Alien.length)];
        fabric.Image.fromURL(alienSrc, function (image) {
            image.set({
                top: y,
                left: x,
                selectable: false
            });
            image.scaleToHeight(70);
            image.set("data", { speed, cooldown: Math.random() * 2000 });
            canvas.add(image);
            entities.aliens.push(image);
        });
    }

    function spawnAlienWave() {
        const level = getLevelConfig();
        const group = Math.random() < level.groupChance;
        const count = group ? Math.floor(Math.random() * 3) + 2 : 1;
        const spacing = 80;
        const startX = Math.random() * (canvas.getWidth() - spacing * count);
        for (let i = 0; i < count; i += 1) {
            const x = Math.max(10, startX + i * spacing);
            spawnAlien(x, -80 - i * 40, level.alienSpeed + Math.random());
        }
    }

    function spawnPowerup() {
        const powerup = new fabric.Circle({
            left: Math.random() * (canvas.getWidth() - 30),
            top: -30,
            radius: 14,
            fill: "#4caf50",
            stroke: "#e8f5e9",
            strokeWidth: 2,
            selectable: false
        });
        powerup.set("data", { speed: 1.2 + Math.random() });
        canvas.add(powerup);
        entities.powerups.push(powerup);
    }

    function spawnObstacle() {
        const obstacle = new fabric.Circle({
            left: Math.random() * (canvas.getWidth() - 60),
            top: -60,
            radius: 25,
            fill: "#6d4c41",
            stroke: "#d7ccc8",
            strokeWidth: 2,
            selectable: false
        });
        obstacle.set("data", { speed: 1 + Math.random() });
        canvas.add(obstacle);
        entities.obstacles.push(obstacle);
    }

    function intersects(a, b) {
        const rectA = a.getBoundingRect(true);
        const rectB = b.getBoundingRect(true);
        return !(
            rectA.left > rectB.left + rectB.width ||
            rectA.left + rectA.width < rectB.left ||
            rectA.top > rectB.top + rectB.height ||
            rectA.top + rectA.height < rectB.top
        );
    }

    function firePlayer() {
        if (!entities.player) return;
        const now = Date.now();
        if (now - state.lastShot < 300) return;
        state.lastShot = now;
        const x = entities.player.left + entities.player.getScaledWidth() / 2 - 3;
        const y = entities.player.top - 20;
        const bullet = createBullet(x, y, 7.5, "#90caf9", -1);
        entities.playerBullets.push(bullet);
    }

    function fireAlien(alien) {
        const x = alien.left + alien.getScaledWidth() / 2 - 3;
        const y = alien.top + alien.getScaledHeight() + 5;
        const bullet = createBullet(x, y, 4 + Math.random(), "#ff5252", 1);
        entities.alienBullets.push(bullet);
    }

    function updateEntities() {
        const levelConfig = getLevelConfig();
        state.level = levelConfig.label;
        updateHud();

        if (controls.fire) {
            firePlayer();
        }

        if (entities.player) {
            const speed = 4.5;
            if (controls.up) entities.player.top -= speed;
            if (controls.down) entities.player.top += speed;
            if (controls.left) entities.player.left -= speed;
            if (controls.right) entities.player.left += speed;
            keepInBounds(entities.player);
        }

        entities.playerBullets = entities.playerBullets.filter((bullet) => {
            const data = bullet.get("data");
            bullet.top += data.speed * data.direction;
            if (bullet.top < -30) {
                canvas.remove(bullet);
                return false;
            }
            return true;
        });

        entities.alienBullets = entities.alienBullets.filter((bullet) => {
            const data = bullet.get("data");
            bullet.top += data.speed * data.direction;
            if (bullet.top > canvas.getHeight() + 30) {
                canvas.remove(bullet);
                return false;
            }
            return true;
        });

        entities.aliens = entities.aliens.filter((alien) => {
            const data = alien.get("data");
            alien.top += data.speed;
            data.cooldown -= 16;
            if (data.cooldown <= 0) {
                if (Math.random() < levelConfig.fireChance) {
                    fireAlien(alien);
                }
                data.cooldown = 1000 + Math.random() * 2000;
            }
            if (alien.top > canvas.getHeight() + 80) {
                canvas.remove(alien);
                return false;
            }
            return true;
        });

        entities.powerups = entities.powerups.filter((item) => {
            const data = item.get("data");
            item.top += data.speed;
            if (item.top > canvas.getHeight() + 40) {
                canvas.remove(item);
                return false;
            }
            return true;
        });

        entities.obstacles = entities.obstacles.filter((item) => {
            const data = item.get("data");
            item.top += data.speed;
            if (item.top > canvas.getHeight() + 80) {
                canvas.remove(item);
                return false;
            }
            return true;
        });

        handleCollisions();
        canvas.requestRenderAll();
    }

    function handleCollisions() {
        if (!entities.player) return;

        entities.aliens = entities.aliens.filter((alien) => {
            let alive = true;
            entities.playerBullets = entities.playerBullets.filter((bullet) => {
                if (intersects(alien, bullet)) {
                    canvas.remove(bullet);
                    alive = false;
                    state.score += 50;
                    return false;
                }
                return true;
            });

            if (alive && intersects(alien, entities.player)) {
                state.health -= 20;
                alive = false;
            }

            if (!alive) {
                canvas.remove(alien);
            }
            return alive;
        });

        entities.obstacles = entities.obstacles.filter((obstacle) => {
            let keep = true;
            entities.playerBullets = entities.playerBullets.filter((bullet) => {
                if (intersects(obstacle, bullet)) {
                    canvas.remove(bullet);
                    state.score += 10;
                    keep = false;
                    return false;
                }
                return true;
            });
            if (keep && intersects(obstacle, entities.player)) {
                state.health -= 10;
                keep = false;
            }
            if (!keep) {
                canvas.remove(obstacle);
            }
            return keep;
        });

        entities.alienBullets = entities.alienBullets.filter((bullet) => {
            if (intersects(bullet, entities.player)) {
                canvas.remove(bullet);
                state.health -= 10;
                return false;
            }
            return true;
        });

        entities.powerups = entities.powerups.filter((power) => {
            if (intersects(power, entities.player)) {
                canvas.remove(power);
                state.health = Math.min(100, state.health + 20);
                state.score += 15;
                return false;
            }
            return true;
        });

        if (state.health <= 0) {
            endGame();
        }
    }

    function startGameLoop() {
        loopInterval = setInterval(updateEntities, 16);
        timerInterval = setInterval(function () {
            state.elapsed += 1;
            const min = parseInt(state.elapsed / 60);
            const second = state.elapsed % 60;
            const display = min > 0 ? `${min}min:${second}s` : `${second}s`;
            $(".game-time").text(display);
        }, 1000);
    }

    function scheduleSpawns() {
        const now = Date.now();
        const level = getLevelConfig();
        if (now - state.lastSpawn > level.spawnInterval) {
            spawnAlienWave();
            state.lastSpawn = now;
        }
        if (now - state.lastPowerup > 7000) {
            spawnPowerup();
            state.lastPowerup = now;
        }
        if (now - state.lastObstacle > 5000) {
            spawnObstacle();
            state.lastObstacle = now;
        }
    }

    function startSpawner() {
        setInterval(function () {
            if (state.running) {
                scheduleSpawns();
            }
        }, 500);
    }

    function resetGame() {
        state.score = 0;
        state.health = 100;
        state.level = 1;
        state.elapsed = 0;
        state.lastShot = 0;
        state.lastSpawn = 0;
        state.lastPowerup = 0;
        state.lastObstacle = 0;
        updateHud();
        $(".game-time").text("0s");
        entities.aliens.forEach((item) => canvas.remove(item));
        entities.playerBullets.forEach((item) => canvas.remove(item));
        entities.alienBullets.forEach((item) => canvas.remove(item));
        entities.powerups.forEach((item) => canvas.remove(item));
        entities.obstacles.forEach((item) => canvas.remove(item));
        entities.aliens = [];
        entities.playerBullets = [];
        entities.alienBullets = [];
        entities.powerups = [];
        entities.obstacles = [];
        if (entities.player) {
            canvas.remove(entities.player);
            entities.player = null;
        }
    }

    function startGame() {
        if (state.running) {
            return;
        }
        resetGame();
        state.running = true;
        $(".game-starter").hide();
        $(".game-menu").show();
        $(".game-controls").show();
        createPlayer().then(() => {
            startGameLoop();
        });
    }

    function endGame() {
        state.running = false;
        clearInterval(loopInterval);
        clearInterval(timerInterval);
        $(".game-starter").show();
        $(".game-menu").hide();
        $(".game-controls").hide();
        $(".intro").text("Mission terminée ! Sélectionnez un vaisseau pour rejouer.");
    }

    function handleKey(direction, isDown) {
        if (Object.prototype.hasOwnProperty.call(controls, direction)) {
            controls[direction] = isDown;
        }
    }

    $(document).on("keydown", function (e) {
        switch (e.originalEvent.code) {
            case "ArrowUp":
            case "KeyW":
                handleKey("up", true);
                break;
            case "ArrowDown":
            case "KeyS":
                handleKey("down", true);
                break;
            case "ArrowLeft":
            case "KeyA":
                handleKey("left", true);
                break;
            case "ArrowRight":
            case "KeyD":
                handleKey("right", true);
                break;
            case "Space":
                handleKey("fire", true);
                break;
            default:
                break;
        }
    });

    $(document).on("keyup", function (e) {
        switch (e.originalEvent.code) {
            case "ArrowUp":
            case "KeyW":
                handleKey("up", false);
                break;
            case "ArrowDown":
            case "KeyS":
                handleKey("down", false);
                break;
            case "ArrowLeft":
            case "KeyA":
                handleKey("left", false);
                break;
            case "ArrowRight":
            case "KeyD":
                handleKey("right", false);
                break;
            case "Space":
                handleKey("fire", false);
                break;
            default:
                break;
        }
    });

    $(".control-btn").on("touchstart mousedown", function (event) {
        event.preventDefault();
        const action = $(this).data("action");
        handleKey(action, true);
        if (action === "fire") {
            firePlayer();
        }
    });

    $(".control-btn").on("touchend mouseup mouseleave", function (event) {
        event.preventDefault();
        const action = $(this).data("action");
        handleKey(action, false);
    });

    $(".game-vaiseau img").on("click", function () {
        $(".game-vaiseau img").removeClass("selected");
        $(this).addClass("selected");
        selectedShip = $(this).data("ship");
    });

    $("#start").on("click", function () {
        startGame();
    });

    $(window).on("resize", resizeCanvas);

    setGameBackgroundImage();
    resizeCanvas();
    startSpawner();
    $(".game-vaiseau img.default-vaiseau").addClass("selected");
});
