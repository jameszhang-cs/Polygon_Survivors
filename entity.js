

class Entity {
    constructor(health, transform) {
        this.health = health;
        this.transform = transform
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) {
            this.health = 0;
            this.onDeath();
        }
    }

    onDeath() {
        // Handle death (can be overridden in subclasses)
        console.log("Entity died");
    }

    // Additional common methods...
}

export class Player extends Entity {
    constructor(health, level, transform, velocity, speed) {
        super(health, transform);
        this.velocity = velocity;
        this.speed = speed;
        this.level = level;
    }

    levelUp() {
        this.level += 1;
        console.log(`Player leveled up to ${this.level}`);
    }

    // Override onDeath for specific player behavior
    onDeath() {
        console.log("Player has died");
        // Specific player death behavior...
    }

    // Player-specific methods...
}

export class Enemy extends Entity {
    constructor(health, transform) {
        super(health, transform);
    }

    // Override onDeath for specific enemy behavior
    onDeath() {
        console.log("Enemy defeated");
        // Specific enemy death behavior...
    }

    // Enemy-specific methods...
}

