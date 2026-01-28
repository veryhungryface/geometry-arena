/**
 * Geometry Battle Arena - Game Logic (Character Reactions & UI Fixes)
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('game-container');
        
        // Game State
        this.state = 'IDLE'; 
        this.subState = 'DRAWING';
        
        // Mission Data
        this.currentMission = null; 
        this.defenseMissionType = null;
        
        // Data Structures
        this.points = [];
        this.defenseObjects = [];
        this.selectedObjects = [];
        
        // Stats
        this.playerHp = 100;
        this.maxPlayerHp = 100;
        this.enemyHp = 500;
        this.maxEnemyHp = 500;
        
        // Timer
        this.turnTimer = 0;
        this.maxTurnTime = 10;
        this.lastTime = 0;
        this.isTimerRunning = false;
        
        // Targets
        this.targetShape = null; 

        // Mouse
        this.mouseX = 0;
        this.mouseY = 0;

        this.particles = [];
        
        // Character Elements
        this.charPlayer = document.getElementById('char-player');
        this.charEnemy = document.getElementById('char-enemy');

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetInput());

        // Start Idle Animation
        this.charPlayer.classList.add('char-idle');
        this.charEnemy.classList.add('char-idle');

        requestAnimationFrame((time) => this.loop(time));
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    startGame() {
        this.playerHp = 100;
        this.enemyHp = 500;
        this.points = [];
        this.defenseObjects = [];
        this.updateUI();
        document.getElementById('game-modal').classList.add('hidden');
        this.startPlayerTurn();
    }

    // --- Turn System ---

    startPlayerTurn() {
        if (this.checkGameOver()) return;

        this.state = 'PLAYER_TURN';
        this.subState = 'DRAWING';
        this.resetInput();
        
        const missions = [
            { type: 'triangle', name: '직각삼각형', points: 3 },
            { type: 'square', name: '정사각형', points: 4 },
            { type: 'rhombus', name: '마름모', points: 4 },
            { type: 'parallelogram', name: '평행사변형', points: 4 }
        ];
        this.currentMission = missions[Math.floor(Math.random() * missions.length)];
        
        this.maxTurnTime = 12; 
        this.turnTimer = this.maxTurnTime;
        this.isTimerRunning = true;

        this.updateTurnUI("PLAYER TURN", "border-cyan-500", "text-cyan-400");
        this.updateMissionUI(`공격: ${this.currentMission.name}`, `${this.currentMission.points}개의 점을 찍어 완성하세요`);
        this.showMessage("YOUR TURN", `${this.currentMission.name}을(를) 그리세요!`);
        
        this.setUrgentMode(false);
    }

    startEnemyTurn() {
        if (this.checkGameOver()) return;

        this.state = 'ENEMY_TURN';
        this.isTimerRunning = false;
        this.resetInput();
        
        this.updateTurnUI("ENEMY TURN", "border-pink-500", "text-pink-500");
        this.updateMissionUI("WARNING", "적의 공격이 감지되었습니다!");
        
        setTimeout(() => {
            this.startDefensePhase();
        }, 1500);
    }

    startDefensePhase() {
        this.state = 'DEFENSE_PHASE';
        this.resetInput();
        this.setUrgentMode(true);

        const defenseTypes = ['draw', 'select'];
        this.defenseMissionType = defenseTypes[Math.floor(Math.random() * defenseTypes.length)];

        this.maxTurnTime = 8;
        this.turnTimer = this.maxTurnTime;
        this.isTimerRunning = true;

        if (this.defenseMissionType === 'draw') {
            this.subState = 'DRAWING';
            this.generateTargetShape(); 
            this.updateMissionUI("방어: 닮음 도형 그리기", "초록색 도형과 닮은 꼴을 그리세요!");
            this.showMessage("DEFENSE", "닮은 도형을 그리세요!");
        } else {
            this.subState = 'SELECTING';
            this.generateFloatingShapes(); 
            this.updateMissionUI("방어: 닮음 쌍 찾기", "떠다니는 도형 중 닮은 꼴 2개를 선택하세요!");
            this.showMessage("DEFENSE", "닮은 쌍을 찾아 클릭하세요!");
        }

        this.updateTurnUI("DEFENSE MODE", "border-green-500", "text-green-400");
    }

    // --- Input & Evaluation ---

    handleClick(e) {
        if (!this.isTimerRunning) return;
        if (this.state !== 'PLAYER_TURN' && this.state !== 'DEFENSE_PHASE') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.subState === 'DRAWING') {
            const max = (this.state === 'DEFENSE_PHASE' && this.defenseMissionType === 'draw') ? 3 : this.currentMission.points;
            
            if (this.points.length < max) {
                this.points.push({ x, y });
                this.createExplosion(x, y, '#60a5fa', 5);
                if (this.points.length === max) {
                    this.evaluateDrawing();
                }
            }
        } else if (this.subState === 'SELECTING') {
            this.checkObjectClick(x, y);
        }
    }

    checkObjectClick(x, y) {
        for (let obj of this.defenseObjects) {
            const dist = Math.sqrt(Math.pow(x - obj.x, 2) + Math.pow(y - obj.y, 2));
            if (dist < obj.size + 20) {
                if (this.selectedObjects.includes(obj.id)) {
                    this.selectedObjects = this.selectedObjects.filter(id => id !== obj.id);
                } else {
                    if (this.selectedObjects.length < 2) {
                        this.selectedObjects.push(obj.id);
                        this.createExplosion(obj.x, obj.y, '#4ade80', 10);
                        
                        if (this.selectedObjects.length === 2) {
                            this.evaluateSelection();
                        }
                    }
                }
                break;
            }
        }
    }

    evaluateDrawing() {
        this.isTimerRunning = false;
        let result = { valid: false, accuracy: 0 };

        if (this.state === 'PLAYER_TURN') {
            switch(this.currentMission.type) {
                case 'triangle': result = MathUtils.checkRightTriangle(this.points); break;
                case 'square': result = MathUtils.checkSquare(this.points); break;
                case 'rhombus': result = MathUtils.checkRhombus(this.points); break;
                case 'parallelogram': result = MathUtils.checkParallelogram(this.points); break;
            }

            if (result.valid) {
                const damage = Math.floor(50 * (result.accuracy / 100) * (this.currentMission.points / 3 + 0.5));
                this.enemyHp = Math.max(0, this.enemyHp - damage);
                this.createExplosion(this.points[0].x, this.points[0].y, '#f472b6', 30);
                this.shakeScreen();
                this.triggerReaction('player', 'happy');
                this.triggerReaction('enemy', 'hit');
                this.showMessage("CRITICAL HIT!", `${this.currentMission.name} 성공! ${damage} DMG`);
            } else {
                this.showMessage("MISS", "도형이 정확하지 않습니다!");
                this.triggerReaction('player', 'hit'); // Self embarrassment?
            }
            
            setTimeout(() => this.startEnemyTurn(), 1500);

        } else if (this.state === 'DEFENSE_PHASE') {
            result = MathUtils.checkSimilarity(this.points, this.targetShape.sides);
            
            if (result.valid) {
                this.showMessage("PERFECT GUARD", "완벽하게 방어했습니다!");
                this.createExplosion(this.points[0].x, this.points[0].y, '#4ade80', 20);
                this.triggerReaction('player', 'happy');
            } else {
                const damage = 50;
                this.playerHp = Math.max(0, this.playerHp - damage);
                this.shakeScreen();
                this.showMessage("GUARD BROKEN", `방어 실패! -${damage} HP`);
                this.triggerReaction('enemy', 'happy');
                this.triggerReaction('player', 'hit');
            }
            
            setTimeout(() => this.startPlayerTurn(), 1500);
        }
        
        this.updateUI();
    }

    evaluateSelection() {
        this.isTimerRunning = false;
        
        const obj1 = this.defenseObjects.find(o => o.id === this.selectedObjects[0]);
        const obj2 = this.defenseObjects.find(o => o.id === this.selectedObjects[1]);
        
        if (obj1.ratioId === obj2.ratioId) {
             this.showMessage("PERFECT GUARD", "닮음 쌍을 찾았습니다!");
             this.triggerReaction('player', 'happy');
        } else {
             const damage = 50;
             this.playerHp = Math.max(0, this.playerHp - damage);
             this.shakeScreen();
             this.showMessage("WRONG PAIR", `틀렸습니다! -${damage} HP`);
             this.triggerReaction('enemy', 'happy');
             this.triggerReaction('player', 'hit');
        }
        
        this.updateUI();
        setTimeout(() => this.startPlayerTurn(), 1500);
    }

    // --- Reaction System ---

    triggerReaction(charSide, type) {
        const el = charSide === 'player' ? this.charPlayer : this.charEnemy;
        const animClass = `anim-${type}`;
        
        // Reset animation
        el.classList.remove('anim-happy', 'anim-hit', 'anim-attack-right');
        void el.offsetWidth; // Force reflow
        
        el.classList.add(animClass);
        
        // Remove class after animation
        setTimeout(() => {
            el.classList.remove(animClass);
        }, 1000);
    }

    // --- Generation Logic ---

    generateTargetShape() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        // Center-ish but not overlapping UI too much
        const ox = w * 0.7; 
        const oy = h * 0.3;
        
        const p1 = { x: ox, y: oy };
        const p2 = { x: ox - 40 - Math.random() * 40, y: oy + 40 + Math.random() * 40 };
        const p3 = { x: ox + 20 + Math.random() * 30, y: oy + 50 + Math.random() * 40 };
        
        this.targetShape = {
            points: [p1, p2, p3],
            sides: MathUtils.getTriangleSides([p1, p2, p3])
        };
    }

    generateFloatingShapes() {
        this.defenseObjects = [];
        this.selectedObjects = [];
        
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        const baseSides = [30, 40, 50]; 
        const otherSides = [30, 30, 30]; 
        
        for(let i=0; i<5; i++) {
            let isTarget = (i < 2); 
            let sides = isTarget ? baseSides : otherSides;
            let scale = 0.5 + Math.random(); 
            
            // Avoid edges where characters are
            const padding = 100;
            const safeW = w - 2 * padding;
            
            this.defenseObjects.push({
                id: i,
                x: padding + Math.random() * safeW,
                y: 100 + Math.random() * (h - 200),
                sides: sides,
                scale: scale,
                size: 30 * scale,
                rotation: Math.random() * Math.PI * 2,
                ratioId: isTarget ? 1 : 2,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3
            });
        }
    }

    // --- Core Loop ---

    loop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (this.isTimerRunning && this.turnTimer > 0) {
            this.turnTimer -= deltaTime;
            if (this.turnTimer <= 0) this.handleTimeOut();
        }

        const timerBar = document.getElementById('timer-bar');
        if (timerBar) {
            const pct = (this.turnTimer / this.maxTurnTime) * 100;
            timerBar.style.width = `${pct}%`;
            timerBar.className = pct < 30 ? "h-full bg-red-500 shadow-[0_0_15px_red] transition-all duration-75" : "h-full bg-yellow-400 transition-all duration-75";
        }

        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Target (Green)
        if (this.state === 'DEFENSE_PHASE' && this.subState === 'DRAWING' && this.targetShape) {
            this.drawPolygon(this.targetShape.points, '#4ade80', true);
            this.ctx.fillStyle = '#4ade80';
            this.ctx.font = 'bold 14px Orbitron';
            this.ctx.fillText("TARGET", this.targetShape.points[0].x, this.targetShape.points[0].y - 15);
        }

        // Draw Floating Objects
        if (this.state === 'DEFENSE_PHASE' && this.subState === 'SELECTING') {
            this.defenseObjects.forEach(obj => {
                obj.x += obj.vx; obj.y += obj.vy;
                if(obj.x < 50 || obj.x > this.canvas.width - 50) obj.vx *= -1;
                if(obj.y < 50 || obj.y > this.canvas.height - 50) obj.vy *= -1;

                this.ctx.save();
                this.ctx.translate(obj.x, obj.y);
                this.ctx.rotate(obj.rotation);
                this.ctx.beginPath();
                
                let s = obj.size;
                // Draw based on type
                if(obj.ratioId === 1) { 
                     // Right triangle approx
                     this.ctx.moveTo(-s*0.8, -s);
                     this.ctx.lineTo(s*0.8, s);
                     this.ctx.lineTo(-s*0.8, s);
                } else { 
                     // Equilateral approx
                     this.ctx.moveTo(0, -s);
                     this.ctx.lineTo(s*0.8, s*0.6);
                     this.ctx.lineTo(-s*0.8, s*0.6);
                }
                
                this.ctx.closePath();
                
                if (this.selectedObjects.includes(obj.id)) {
                    this.ctx.fillStyle = 'rgba(250, 204, 21, 0.8)';
                    this.ctx.strokeStyle = '#facc15';
                    this.ctx.lineWidth = 4;
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowColor = '#facc15';
                } else {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.lineWidth = 2;
                    this.ctx.shadowBlur = 0;
                }
                
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            });
        }

        // Draw User Input
        if (this.subState === 'DRAWING' && this.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) this.ctx.lineTo(this.points[i].x, this.points[i].y);
            
            const max = (this.state === 'DEFENSE_PHASE') ? 3 : this.currentMission.points;
            if (this.points.length < max) this.ctx.lineTo(this.mouseX, this.mouseY);
            else this.ctx.closePath();

            this.ctx.strokeStyle = (this.state === 'PLAYER_TURN') ? '#22d3ee' : '#4ade80';
            this.ctx.lineWidth = 4;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.ctx.strokeStyle;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            this.points.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
                this.ctx.fillStyle = '#fff';
                this.ctx.fill();
            });
        }

        this.drawParticles();
    }

    drawPolygon(points, color, dashed) {
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for(let i=1; i<points.length; i++) this.ctx.lineTo(points[i].x, points[i].y);
        this.ctx.closePath();
        this.ctx.strokeStyle = color;
        if(dashed) this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.02;
            if (p.life <= 0) this.particles.splice(i, 1);
            else {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            }
        }
    }

    handleTimeOut() {
        this.isTimerRunning = false;
        this.resetInput();
        if (this.state === 'PLAYER_TURN') {
            this.showMessage("TIME OVER", "공격 실패!");
            this.triggerReaction('player', 'hit');
            setTimeout(() => this.startEnemyTurn(), 1000);
        } else if (this.state === 'DEFENSE_PHASE') {
            const damage = 50;
            this.playerHp = Math.max(0, this.playerHp - damage);
            this.shakeScreen();
            this.showMessage("TIME OVER", "방어 실패!");
            this.triggerReaction('player', 'hit');
            this.triggerReaction('enemy', 'happy');
            this.updateUI();
            setTimeout(() => this.startPlayerTurn(), 1000);
        }
    }

    checkGameOver() {
        if (this.playerHp <= 0 || this.enemyHp <= 0) {
            const modal = document.getElementById('game-modal');
            const h1 = modal.querySelector('h1');
            const startBtn = document.getElementById('start-btn');
            
            if (this.playerHp > 0) {
                h1.innerText = "VICTORY!";
                h1.className = "text-7xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-500 mb-2";
                this.triggerReaction('player', 'happy');
            } else {
                h1.innerText = "GAME OVER";
                h1.className = "text-7xl font-black font-orbitron text-gray-500 mb-2";
                this.triggerReaction('enemy', 'happy');
            }
            startBtn.innerText = "RESTART";
            modal.classList.remove('hidden');
            this.state = 'GAME_OVER';
            return true;
        }
        return false;
    }

    resetInput() {
        this.points = [];
        this.selectedObjects = [];
    }

    createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x, y: y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                life: 1, color: color, size: Math.random()*3+2
            });
        }
    }

    updateUI() {
        document.getElementById('player-hp-bar').style.width = `${(this.playerHp/this.maxPlayerHp)*100}%`;
        document.getElementById('player-hp-text').innerText = `${this.playerHp}/${this.maxPlayerHp}`;
        document.getElementById('enemy-hp-bar').style.width = `${(this.enemyHp/this.maxEnemyHp)*100}%`;
        document.getElementById('enemy-hp-text').innerText = `${this.enemyHp}/${this.maxEnemyHp}`;
    }

    updateTurnUI(text, borderColor, textColor) {
        const ind = document.getElementById('turn-indicator');
        ind.innerText = text;
        ind.className = `mt-1 px-4 py-0.5 rounded-full border-2 ${borderColor} ${textColor} font-bold font-orbitron text-sm transition-colors duration-300`;
    }

    updateMissionUI(title, desc) {
        document.getElementById('mission-text').innerText = title;
    }

    setUrgentMode(isUrgent) {
        const canvas = this.container.querySelector('.max-w-4xl');
        if(isUrgent) canvas.classList.add('urgent-mode');
        else canvas.classList.remove('urgent-mode');
    }

    showMessage(title, sub) {
        const overlay = document.getElementById('message-overlay');
        document.getElementById('msg-title').innerText = title;
        document.getElementById('msg-subtitle').innerText = sub;
        overlay.classList.remove('opacity-0', 'message-fadeout');
        overlay.classList.add('message-pop');
        setTimeout(() => {
            overlay.classList.remove('message-pop');
            overlay.classList.add('message-fadeout');
        }, 1200);
    }
    
    shakeScreen() {
        this.canvas.parentElement.parentElement.classList.add('shake');
        setTimeout(() => this.canvas.parentElement.parentElement.classList.remove('shake'), 500);
    }
}

window.onload = () => new Game();
