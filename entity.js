

class Entity {
    constructor(health, transform) {
        this.health = health;
        this.transform = transform
        this.alive = true;
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
        this.alive = false;
    }

    // Additional common methods...
}

export class Player extends Entity {
    constructor(health, level, transform, velocity, speed) {
        super(health, transform);
        this.velocity = velocity;
        this.speed = speed;
        this.level = level;

        this.levelup_xp = 5;
        this.curr_xp = 0;

        this.sword = true;
        this.laser = false;
        this.orb = false;
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
        this.hit = false;
    }

    // Override onDeath for specific enemy behavior
    onDeath() {
        console.log("Enemy defeated");
        this.alive = false;
        // Specific enemy death behavior...
    }

    // Enemy-specific methods...
}

export class Projectile extends Entity {
    constructor(health, transform) {
        super(health, transform);
    }

    // Override onDeath for specific projectile behavior
    onDeath() {
        console.log("Projectile removed");
        this.alive = false;
    }


}
