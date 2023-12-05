export function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateUnitVector(pos1, pos2) {
    // Calculate vector components
    const deltaX = pos2.x - pos1.x;
    const deltaY = pos2.y - pos1.y;

    // Calculate magnitude
    const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Calculate unit vector components
    const unitX = deltaX / magnitude;
    const unitY = deltaY / magnitude;

    // Return the unit vector as an object
    return { x: unitX, y: unitY };
}

export function scale_velocity(velocity, speed){
    let currentMagnitude = Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]);
    if(currentMagnitude === 0){
        return velocity;
    }

    let normalized_velocity = [velocity[0]/currentMagnitude, velocity[1]/currentMagnitude];
    return [normalized_velocity[0]*speed, normalized_velocity[1]*speed];
}